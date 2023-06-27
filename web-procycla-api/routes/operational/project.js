const router = require("express").Router();
const { project: projectTable, simulation: simulationTable } = require("../../lib/db");
const { protectedMiddleware } = require("../middleware");
const { literal } = require("sequelize");

//PROTECTED ROUTES
router.use(protectedMiddleware);

//Create project
/**
 * @openapi
 * /project:
 *   post:
 *     summary: Create project
 *     tags: [Project]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       200:
 *         description: Project created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
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

        const { name, description } = req.body;
        if(!name) throw new Error("API.INVALID_REQUEST");

        const data = await projectTable.create({ id_user: id_user, name: name, description: description });
        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

//List user projects
/**
 * @openapi
 * /project:
 *   get:
 *     summary: Get project or list of projects created by the user
 *     tags: [Project]
 *     parameters:
 *       - in: query
 *         name: id_project
 *         schema:
 *           type: integer
 *         required: false
 *         description: Project ID (only will return the project if it belongs to the user)
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *           example: 30
 *         required: false
 *         description: Page size. Default 30
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 0
 *         required: false
 *         description: Page number. Default 0
 *     responses:
 *       200:
 *         description: Project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
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

        const { id_project } = req.query;
        if(id_project) {
            const data = await projectTable.findByPk(id_project);
            if(data.id_user != id_user) throw new Error("API.INVALID_CREDENTIALS");

            res.json(data);
        }
        else {
            const { page_size = 30, page = 0 } = req.query;
            const total_count = await projectTable.count({ where: { id_user: id_user } });

            const data = await projectTable.findAll({
                attributes: {
                    include: [
                        [ literal(`(select count(*) from simulation where simulation.id_project = project.id)`), 'simulations' ]
                    ]
                },
                where: { id_user: id_user },
                limit: parseInt(page_size),
                offset: parseInt(page) * parseInt(page_size),
                order: [
                    ['createdAt', 'DESC']
                ]
            });
            res.json({ count: total_count, list: data });
        }
    }
    catch(error) {
        console.log("error", error)
        res.status(400).json({ message: error.message });
    }
});

//Update user project
/**
 * @openapi
 * /project:
 *   put:
 *     summary: Update user project
 *     tags: [Project]
 *     parameters:
 *       - in: query
 *         name: id_project
 *         schema:
 *           type: integer
 *         required: true
 *         description: Project ID (only will update the project if it belongs to the user)
 *     responses:
 *       200:
 *         description: Project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
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

        const { id_project } = req.query;
        if(!id_project) throw new Error("API.INVALID_REQUEST");

        const { name, description } = req.body;
        const data = await projectTable.findByPk(id_project);
        if(data.id_user != id_user) throw new Error("API.INVALID_CREDENTIALS");

        data.set({ name: name, description: description });
        await data.save();
        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

//Destroy user project
/**
 * @openapi
 * /project:
 *   delete:
 *     summary: Delete user project
 *     tags: [Project]
 *     parameters:
 *       - in: query
 *         name: id_project
 *         schema:
 *           type: integer
 *         required: true
 *         description: Project ID (only will update the project if it belongs to the user)
 *     responses:
 *       200:
 *         description: Project
 *         content:
 *           application/json:
 *             schema:
 *               example: true
 *               type: boolean
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

        const { id_project } = req.query;
        if(!id_project) throw new Error("API.INVALID_REQUEST");

        const data = await projectTable.findByPk(id_project);
        if(data.id_user != id_user) throw new Error("API.INVALID_CREDENTIALS");

        await data.destroy();
        res.json(true);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;