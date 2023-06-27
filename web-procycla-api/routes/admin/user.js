const router = require("express").Router();
const { user: userTable } = require("../../lib/db");
const { protectedAdministrativeMiddleware } = require("../middleware");
const { literal } = require("sequelize");

//PROTECTED ADMINISTRATIVE ROUTES
router.use(protectedAdministrativeMiddleware);

/**
 * @openapi
 * /admin/user:
 *   get:
 *     description: This only works for admin users
 *     summary: Get user or list of users
 *     tags: [Admin User]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: false
 *         description: User ID
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
 *         description: User
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", async (req, res) => {
    try {
        const { id } = req.query;
        if(id) {
            const data = await userTable.findByPk(id, { attributes: { exclude: [ 'password', 'secure_login_code' ], include: [ [ literal("datediff(plan_expire_date, now())"), 'plan_expires_in' ] ] } });
            res.json(data);
        }
        else {
            const { page_size = 30, page = 0 } = req.query;
            const total_count = await userTable.count();
            
            const data = await userTable.findAll({
                limit: parseInt(page_size),
                offset: parseInt(page) * parseInt(page_size),
                order: [
                    ['id', 'DESC']
                ],
                attributes: { exclude: [ 'password' ], include: [ [ literal("datediff(plan_expire_date, now())"), 'plan_expires_in' ] ] },
            });
            res.json({ count: total_count, list: data });
        }
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /admin/user:
 *   put:
 *     description: This only works for admin users
 *     summary: Update user
 *     tags: [Admin User]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/", async (req, res) => {
    try {
        const { id } = req.query;
        if(!id) throw new Error("API.INVALID_REQUEST");

        if(req.body.updatedAt) delete req.body["updatedAt"];
        if(req.body.createdAt) delete req.body["createdAt"];

        const data = await userTable.findByPk(id);
        data.set(req.body);
        await data.save();

        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /admin/user:
 *   delete:
 *     description: This only works for admin users
 *     summary: Delete user
 *     tags: [Admin User]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted
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
        const { id } = req.query;
        if(!id || req.id != id) throw new Error("API.INVALID_REQUEST");

        const data = await userTable.findByPk(id);
        await data.destroy();

        res.json(true);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;