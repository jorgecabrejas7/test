const router = require("express").Router();
const { plan: planTable } = require("../../lib/db");
const { middleware } = require("../middleware");

//UNPROTECTED ROUTES
router.use(middleware);

/**
 * @openapi
 * /plan:
 *   get:
 *     summary: List available plans
 *     tags: [Plan]
 *     responses:
 *       200:
 *         description: Plan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Plan'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", async (req, res) => {
    try {
        const data = await planTable.findAll({
            order: [
                ['createdAt', 'DESC']
            ]
        });
        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;