const router = require("express").Router();
const { simulation: simulationTable, project: projectTable } = require("../../lib/db");
const { middleware, protectedMiddleware } = require("../middleware");
const fs = require("fs");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');

//Functions
const startSimulation = async (simulation) => {
    try {
        let dbSimulation = await simulationTable.findByPk(simulation.id);
        if(!dbSimulation) throw new Error("No DB simulation found");

        //BMP Module
        if(dbSimulation.bmp_status == 'pending' || dbSimulation.bmp_status == 'failed') {
            dbSimulation.bmp_status = "running";
            dbSimulation.bmp_result = null;
            await dbSimulation.save();

            const submitData = JSON.parse(simulation.submit_data);
            const loadDataResult = JSON.parse(simulation.load_data_result);
            const body = {
                flow: submitData.flow,
                volatile_solid: submitData.volatile_solids,
                ...loadDataResult
            };

            const bmpResponse = await fetch(process.env.BMP_API_URL + "/api/v1/bmp/run", {
                method: "post",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            
            dbSimulation = await simulationTable.findByPk(simulation.id);
            if(!dbSimulation) throw new Error("No DB simulation found");

            if(bmpResponse.status !== 200) {
                dbSimulation.bmp_status = "failed";
                dbSimulation.bmp_result = bmpResponse.statusText;
                await dbSimulation.save();
            }
            else {
                const bmpResult = await bmpResponse.json();
                if(bmpResult.status_code != 0) dbSimulation.bmp_status = "failed";
                else dbSimulation.bmp_status = "finished";
                dbSimulation.bmp_result = JSON.stringify(bmpResult);
                await dbSimulation.save();
            }
        }

        //CSTR Module
        if((dbSimulation.bmp_status == 'finished' || dbSimulation.bmp_status == 'failed') && (dbSimulation.cstr_status == 'pending' || dbSimulation.cstr_status == 'failed')) {
            const submitData = JSON.parse(dbSimulation.submit_data);
            if(submitData.type != 'plant_operation') {
                dbSimulation.cstr_status = "finished";
                dbSimulation.cstr_result = null;
                await dbSimulation.save();
            }
            else {
                const bmpResult = JSON.parse(dbSimulation.bmp_result);
                
                dbSimulation.cstr_status = "running";
                dbSimulation.cstr_result = "null";
                await dbSimulation.save();

                const getUncertainty = index => {
                    switch(index) {
                        case 0: return "off";
                        case 1: return "bo";
                        case 2: return "kh";
                    }
                    return 'off';
                };

                let cstrResults = [];
                const cstrErrors = [];
                for (let substrateIndex = 0; substrateIndex < bmpResult.substrates.length; substrateIndex++) {
                    const substrate = bmpResult.substrates[substrateIndex];
                    if(substrate.status_code != 0) continue;
                    const cstrResponses = [];
                    for (let index = 0; index < 3; index++) {
                        const body = {
                            V_liq: submitData?.working_volume || 0,
                            V_gas: submitData?.headspace_volume || 0,
                            q_ad: submitData?.flow || 0,
                            COD: submitData?.total_cod || 0,
                            CODs: submitData?.soluble_cod || 0,
                            SV: submitData?.volatile_solids || 0,
                            Ni: submitData?.ammonia_nitrogen || 0,
                            Nt: submitData?.total_nitrogen || 0,
                            pH_in: submitData?.ph || 0,
                            At: submitData?.total_alkalinity || 0,
                            Ap: submitData?.partial_alkalinity || 0,
                            Bo: substrate.params.params[0].value,
                            Kh: substrate.params.params[1].value,
                            uncertainty: getUncertainty(index),
                            progress_url: process.env.APP_URL + "/simulation/progress?simulation_id=" + dbSimulation.id + "&substrate_index=" + substrateIndex + "&length=" + bmpResult.substrates.length + "&index=" + index
                        };
                        
                        const cstrResponse = await fetch(process.env.CSTR_API_URL + "/api/v1/cstr/run", {
                            method: "post",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(body)
                        });

                        if(cstrResponse.status == 200) cstrResponses.push(await cstrResponse.json());
                        else cstrErrors.push(cstrResponse.statusText);
                    }

                    if(cstrResponses.length == 3) {
                        const body = {
                            BoSE: substrate.params.params[0].se,
                            KhSE: substrate.params.params[1].se,
                            BoKhCovariance: substrate.params.params[0].covar_list[0].value,
                            NSamples: substrate.values.filter(s => s > 0.0).length,
                            Original_qGas: cstrResponses[0].results.filter(r => r.name == "gasflow")[0].value?.q_gas,
                            Original_pH: cstrResponses[0].results.filter(r => r.name == "simulate_results")[0].value?.pH,
                            BoDelta_qGas: cstrResponses[1].results.filter(r => r.name == "gasflow")[0].value?.q_gas,
                            BoDelta_pH: cstrResponses[1].results.filter(r => r.name == "simulate_results")[0].value?.pH,
                            KhDelta_qGas: cstrResponses[2].results.filter(r => r.name == "gasflow")[0].value?.q_gas,
                            KhDelta_pH: cstrResponses[2].results.filter(r => r.name == "simulate_results")[0].value?.pH
                        };
                        
                        const cstrUncertaintyPropagationResponse = await fetch(process.env.CSTR_API_URL + "/api/v1/cstr/uncertainty-propagation", {
                            method: "post",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(body)
                        });

                        if(cstrUncertaintyPropagationResponse.status == 200) {
                            const energy = cstrResponses[0].results.filter(r => r.name == "energy")[0];
                            const response = await cstrUncertaintyPropagationResponse.json();
                            response.push(energy);
                            cstrResults.push(response);
                        }
                        else cstrErrors.push(cstrUncertaintyPropagationResponse.statusText);
                    }
                };

                //Result CSTR
                dbSimulation = await simulationTable.findByPk(simulation.id);
                if(!dbSimulation) throw new Error("No DB simulation found");

                if(cstrResults.length <= 0) {
                    dbSimulation.cstr_status = "failed";
                    dbSimulation.cstr_result = cstrErrors.join(", ");
                    await dbSimulation.save();
                }
                else {
                    dbSimulation.cstr_status = "finished";
                    dbSimulation.cstr_result = JSON.stringify(cstrResults);
                    await dbSimulation.save();
                }
            }
        }
    }
    catch(error) {
        console.log(error);
    }
};

//UNPROTECTED ROUTES
router.use(middleware);

router.post("/progress", async (req, res) => {
    try {
        const { simulation_id, substrate_index, length, index } = req.query;
        const dbSimulation = await simulationTable.findByPk(simulation_id);
        if(!dbSimulation) throw new Error("No DB simulation found");

        const progress = (parseInt(substrate_index) * 100 + parseInt(index) * 100 / 3) / parseInt(length);
        dbSimulation.cstr_progress = progress;
        await dbSimulation.save();
        res.json(true);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

//PROTECTED ROUTES
router.use(protectedMiddleware);

//Wrangling API
/**
 * @openapi
 * /wrangling/BPC/load_file:
 *   post:
 *     summary: Load file
 *     tags: [Wrangling]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File loaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WranglingBPCFile'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/wrangling/BPC/load_file", async (req, res) => {
    try {
        if(!req.files || Object.keys(req.files).length === 0) {
            throw new Error("API.INVALID_REQUEST");
        }

        const file = req.files.file;
        const formData = new FormData();
        const fileData = fs.readFileSync(file.tempFilePath);
        formData.append("body", fileData, { filename: file.name });
        
        const response = await fetch(process.env.WRANGLING_API_URL + "/api/v1/wrangling/BPC/load_file", { method: 'post', body: formData });
        if(response.status != 200) throw new Error("API.INTERNAL_ERROR");

        const data = await response.json();
        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /wrangling/BPC/process_data:
 *   post:
 *     summary: Process data
 *     tags: [Wrangling]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WranglingBPCData'
 *     responses:
 *       200:
 *         description: Data processed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WranglingBPCData'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/wrangling/BPC/process_data", async (req, res) => {
    try {
        const data = req.body;
        if(!data) throw new Error("API.INVALID_REQUEST");

        const response = await fetch(process.env.WRANGLING_API_URL + "/api/v1/wrangling/BPC/process_data", { method: 'post', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
        if(response.status != 200) throw new Error("API.INTERNAL_ERROR");

        const result = await response.json();
        res.json(result);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /wrangling/procycla/load_file:
 *  post:
 *     summary: Load file
 *     tags: [Wrangling]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File loaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WranglingProCyclaFile'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/wrangling/procycla/load_file", async (req, res) => {
    try {
        if(!req.files || Object.keys(req.files).length === 0) {
            throw new Error("API.INVALID_REQUEST");
        }

        const file = req.files.file;
        const formData = new FormData();
        const fileData = fs.readFileSync(file.tempFilePath);
        formData.append("body", fileData, { filename: file.name });
        
        const response = await fetch(process.env.WRANGLING_API_URL + "/api/v1/wrangling/procycla/load_file", { method: 'post', body: formData });
        if(response.status != 200) throw new Error("API.INTERNAL_ERROR");

        const data = await response.json();
        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

//Start Simulation
/**
 * @openapi
 * /simulation/start:
 *   get:
 *     summary: Start simulation
 *     tags: [Simulation]
 *     parameters:
 *       - in: query
 *         name: simulation_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Simulation ID
 *     responses:
 *       200:
 *         description: Simulation started
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/start", async (req, res) => {
    try {
        const { simulation_id } = req.query;
        if(!simulation_id) throw new Error("API.INVALID_REQUEST");

        const simulation = await simulationTable.findByPk(simulation_id);
        if(!simulation || simulation.load_data_status != 'finished') throw new Error("API.INVALID_REQUEST");

        const project = await projectTable.findByPk(simulation.id_project);
        if(!project) throw new Error("API.INVALID_REQUEST");
        if(project.id_user != req.id) throw new Error("API.INVALID_CREDENTIALS");

        startSimulation(simulation);
        res.sendStatus(200);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

//Create simulation
/**
 * @openapi
 * /simulation:
 *   post:
 *     summary: Create simulation
 *     tags: [Simulation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Simulation'
 *     responses:
 *       200:
 *         description: Simulation created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Simulation'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", async (req, res) => {
    try {
        const id_user = req.id;
        if(!id_user) throw new Error("API.INVALID_REQUEST");

        const { name, description, submit_data, id_project } = req.body;
        if(!name || !id_project || !submit_data) throw new Error("API.INVALID_REQUEST");

        const project = await projectTable.findByPk(id_project);
        if(!project) throw new Error("API.INVALID_REQUEST");
        if(project.id_user != id_user) throw new Error("API.INVALID_CREDENTIALS");

        const data = await simulationTable.create({
            name: name,
            description: description,
            submit_data: submit_data,
            id_project: id_project
        });

        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

//Upload simulation input file
/**
 * @openapi
 * /simulation/upload_input:
 *   post:
 *     summary: Upload simulation input file
 *     tags: [Simulation]
 *     parameters:
 *       - in: query
 *         name: simulation_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Simulation ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Simulation input file uploaded
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/upload_input", async (req, res) => {
    try {
        const id_user = req.id;
        if(!id_user) throw new Error("API.INVALID_REQUEST");

        const { simulation_id } = req.query;
        if(!simulation_id) throw new Error("API.INVALID_REQUEST");

        const simulation = await simulationTable.findByPk(simulation_id);
        const project = await projectTable.findByPk(simulation.id_project);
        if(project.id_user != id_user) throw new Error("API.INVALID_CREDENTIALS");

        if(!req.files || Object.keys(req.files).length === 0) {
            throw new Error("API.INVALID_REQUEST");
        }

        const path = (process.env.FILES_PATH || "files") + "/inputs/";
        if(!fs.existsSync(path))
        await fs.promises.mkdir(path, { recursive: true });

        const file = req.files.file;
        const finalPath = path + `${ simulation_id } - ${ file.name}`;
        file.mv(finalPath, async error => {
            if(error) 
            throw new Error("API.INTERNAL_ERROR");
            
            simulation.upload_input_file = finalPath;
            await simulation.save();
            res.sendStatus(200);
        });
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

//Download simulation input file
/**
 * @openapi
 * /simulation/download_input:
 *   get:
 *     summary: Download simulation input file
 *     tags: [Simulation]
 *     parameters:
 *       - in: query
 *         name: simulation_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Simulation ID
 *     responses:
 *       200:
 *         description: Simulation input file downloaded
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/download_input", async (req, res) => {
    try {
        const { simulation_id } = req.query;
        if(!simulation_id) throw new Error("API.INVALID_REQUEST");

        const simulation = await simulationTable.findByPk(simulation_id);
        if(!simulation) throw new Error("API.INVALID_REQUEST");

        const project = await projectTable.findByPk(simulation.id_project);
        if(!project) throw new Error("API.INVALID_REQUEST");
        if(project.id_user != req.id) throw new Error("API.INVALID_CREDENTIALS");

        const file = simulation.upload_input_file;
        if(fs.existsSync(file)) res.sendFile(file, { root: "./" });
        else throw new Error("API.INTERNAL_ERROR");
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

//List simulations for owner project or get simulation by id if project belongs to the user
/**
 * @openapi
 * /simulation:
 *   get:
 *     summary: Get simulation
 *     tags: [Simulation]
 *     parameters:
 *       - in: query
 *         name: id_simulation
 *         schema:
 *           type: integer
 *         description: ID of the simulation
 *       - in: query
 *         name: id_project
 *         schema:
 *           type: integer
 *         description: ID of the project
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *         description: Page size
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page
 *     responses:
 *       200:
 *         description: Simulation list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Total count of simulations
 *                   example: 1
 *                 list:
 *                   type: array
 *                   description: List of simulations
 *                   items:
 *                     $ref: '#/components/schemas/Simulation'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", async (req, res) => {
    try {
        const id_user = req.id;
        if(!id_user) throw new Error("API.INVALID_REQUEST");

        const { id_simulation, id_project } = req.query;
        if(id_simulation) {
            const data = await simulationTable.findByPk(id_simulation);
            const project = await projectTable.findByPk(data.id_project);
            if(!project) throw new Error("API.INVALID_REQUEST");
            if(project.id_user != id_user) throw new Error("API.INVALID_CREDENTIALS");

            res.json({ project_name: project.name, ...data.dataValues });
        }
        else if(id_project) {
            const { page_size = 30, page = 0 } = req.query;
            const total_count = await simulationTable.count({ where: { id_project: id_project } });

            const data = await simulationTable.findAll({
                where: { id_project: id_project },
                limit: parseInt(page_size),
                offset: parseInt(page) * parseInt(page_size),
                order: [
                    ['createdAt', 'DESC']
                ]
            });
            res.json({ count: total_count, list: data });
        }
        else {
            throw new Error("API.INVALID_REQUEST");
        }
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

//Update simulation by id if project belongs to the user
/**
 * @openapi
 * /simulation:
 *   put:
 *     summary: Update simulation
 *     tags: [Simulation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_simulation:
 *                 type: integer
 *                 description: Simulation ID
 *               name:
 *                 type: string
 *                 description: Simulation name
 *               description:
 *                 type: string
 *                 description: Simulation description
 *     responses:
 *       200:
 *         description: Simulation updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Simulation'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/", async (req, res) => {
    try {
        const id_user = req.id;
        if(!id_user) throw new Error("API.INVALID_REQUEST");

        const { simulation_id } = req.query;

        if(!simulation_id)
        throw new Error("API.INVALID_REQUEST");

        const data = await simulationTable.findByPk(simulation_id);
        const project = await projectTable.findByPk(data.id_project);
        if(project.id_user != id_user) throw new Error("API.INVALID_CREDENTIALS");

        data.set(req.body);
        await data.save();

        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});


//Delete simulation by id if project belongs to the user
/**
 * @openapi
 * /simulation:
 *   delete:
 *     summary: Delete simulation
 *     tags: [Simulation]
 *     parameters:
 *       - in: query
 *         name: simulation_id
 *         schema:
 *           type: integer
 *         description: Simulation ID
 *     responses:
 *       200:
 *         description: Simulation deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: boolean
 *               description: True if simulation successfully deleted
 *               example: true
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/", async (req, res) => {
    try {
        const id_user = req.id;
        if(!id_user) throw new Error("API.INVALID_REQUEST");

        const { simulation_id } = req.query;

        if(!simulation_id)
        throw new Error("API.INVALID_REQUEST");

        const data = await simulationTable.findByPk(simulation_id);
        const project = await projectTable.findByPk(data.id_project);
        if(project.id_user != id_user) throw new Error("API.INVALID_CREDENTIALS");

        await data.destroy();

        res.json(true);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});


module.exports = router;