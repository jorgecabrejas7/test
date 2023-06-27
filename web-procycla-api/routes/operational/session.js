const router = require("express").Router();
const { session: sessionTable } = require("../../lib/db");
const { protectedMiddleware } = require("../middleware");
const { literal } = require("sequelize");

//PROTECTED ROUTES
router.use(protectedMiddleware);

/**
 * @openapi
 * /session:
 *   get:
 *     summary: Get list of sessions created by the user
 *     tags: [Session]
 *     parameters:
 *       - in: query
 *         name: id_user
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID (only will return the session if the ID is the same as the logged user)
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
 *         description: Session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", async (req, res) => {
    try {
        const { id_user } = req.query;
        if(!id_user) throw new Error("API.INVALID_REQUEST");
        if(req.id != id_user) throw new Error("API.INVALID_CREDENTIALS");

        const { page_size = 30, page = 0 } = req.query;
        const total_count = await sessionTable.count({ where: { id_user: id_user } });

        const data = await sessionTable.findAll({
            where: { id_user: id_user },
            limit: parseInt(page_size),
            offset: parseInt(page) * parseInt(page_size),
            order: [
                ['valid', 'DESC'],
                ['createdAt', 'DESC']
            ],
            attributes: [
                'id', 'expires_in', 'ip', 'device', 'valid',
                [ literal("date_format(date_add(createdAt, interval expires_in day), '%d/%m/%Y %k:%i:%s')"), 'expire_date' ]
            ]
        });
        res.json({ count: total_count, list: data });
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /session/update:
 *   get:
 *     summary: Update user session device and IP
 *     tags: [Session]
 *     parameters:
 *       - in: query
 *         name: session
 *         schema:
 *           type: integer
 *         required: true
 *         description: Session ID (only will update the session if the session user ID is the same as the logged user)
 *     responses:
 *       200:
 *         description: Session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/update", async (req, res) => {
    try {
        const clientIp = req.clientIp.replace('::ffff:', '');
        if(!clientIp) throw new Error("API.INVALID_REQUEST");
        
        const userAgent = req.useragent;
        if(!userAgent) throw new Error("API.INVALID_REQUEST");

        const { session } = req.query;
        if(!session) throw new Error("API.INVALID_REQUEST");
        if(req.session != session) throw new Error("API.INVALID_CREDENTIALS");
        
        const data = await sessionTable.findByPk(session);
        if(!data) throw new Error("API.INVALID_REQUEST");

        const sessionDevice = `${ userAgent.platform } ${ userAgent.os } (${ userAgent.browser } ${ userAgent.version })`;
        data.set({ device: sessionDevice, ip: clientIp });
        await data.save();

        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /session:
 *   put:
 *     summary: Update user session
 *     tags: [Session]
 *     parameters:
 *       - in: query
 *         name: session
 *         schema:
 *           type: integer
 *         required: true
 *         description: Session ID (only will update the session if the session user ID is the same as the logged user)
 *       - in: query
 *         name: id_user
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID (only will update the session if the user ID is the same as the logged user)
 *     responses:
 *       200:
 *         description: Session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/", async (req, res) => {
    try {
        const { id_user, session } = req.query;
        if(!id_user || !session) throw new Error("API.INVALID_REQUEST");
        if(req.id != id_user) throw new Error("API.INVALID_CREDENTIALS");

        if(req.body.updatedAt) delete req.body["updatedAt"];
        if(req.body.createdAt) delete req.body["createdAt"];
        if(req.body.expires_in) delete req.body["expires_in"];

        const data = await sessionTable.findByPk(session);
        if(data.id_user != req.id) throw new Error("API.INVALID_CREDENTIALS");

        data.set(req.body);
        await data.save();

        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;