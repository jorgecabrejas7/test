const router = require("express").Router();
const { user: userTable } = require("../../lib/db");
const { middleware, protectedMiddleware } = require("../middleware");
const { literal } = require("sequelize");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

//UNPROTECTED ROUTES
router.use(middleware);

/**
 * @openapi
 * /user:
 *   post:
 *     summary: Create user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: User created
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
router.post("/", async (req, res) => {
    try {
        if(req.body.role) delete req.body["role"];
        if(req.body.status) delete req.body["status"];
        if(req.body.id_plan) delete req.body["id_plan"];
        if(req.body.plan_expire_date) delete req.body["plan_expire_date"];
        if(req.body.plan_expire_date) delete req.body["plan_expire_date"];
        if(req.body.stripe_customer_id) delete req.body["stripe_customer_id"];

        const data = await userTable.create(req.body);
        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

//PROTECTED ROUTES
router.use(protectedMiddleware);

/**
 * @openapi
 * /user:
 *   get:
 *     summary: Get user
 *     tags: [User]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID (only will return the user if the ID is the same as the logged user)
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

        if(!id)
        throw new Error("API.INVALID_REQUEST");

        if(id != req.id)
        throw new Error("API.INVALID_CREDENTIALS");

        let data = await userTable.findByPk(id, { attributes: { exclude: [ 'password', 'secure_login_code' ], include: [ [ literal("datediff(plan_expire_date, now())"), 'plan_expires_in' ] ] } });

        if(data.plan_expires_in <= 0) data.plan_expires_in = 0;
        const plan_expired = data.plan_expires_in == 0 ? true : false;

        //Stripe
        let
            credit_card_number = null,
            plan_auto_renewal = false;

        if(process.env.STRIPE_SECRET_KEY && data.stripe_customer_id) {
            const userSubscriptions = await stripe.subscriptions.list({ customer: data.stripe_customer_id, status: 'active', limit: 100 });
            if(userSubscriptions.data.length > 0) {
                const subscription = userSubscriptions.data[0];
                if(!subscription.cancel_at_period_end) {
                    if(plan_expired) {
                        const diff = subscription.current_period_end - (Date.now() / 1000);
                        if(diff > 0) {
                            const days = Math.floor(diff / 86400);
                            await userTable.update({ plan_expire_date: literal("date_add(now(), interval " + days + " day)") }, { where: { id: id } });
                            data = await userTable.findByPk(id, { attributes: { include: [ [ literal("datediff(plan_expire_date, now())"), 'plan_expires_in' ] ] } });
                            plan_expired = false;
                        }
                    }
                    
                    plan_auto_renewal = true;
                }
            }

            const userPaymentMethods = await stripe.paymentMethods.list({ customer: data.stripe_customer_id, type: 'card', limit: 100 });
            if(userPaymentMethods.data.length > 0)
            credit_card_number = '*' + userPaymentMethods.data[0].card.last4;
        }

        res.json({ ...data.dataValues, plan_expired: plan_expired, plan_auto_renewal: plan_auto_renewal, credit_card_number: credit_card_number });
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

//Get User Language
/**
 * @openapi
 * /user/language:
 *   get:
 *     summary: Get user language
 *     tags: [User]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID (only will return the user if the ID is the same as the logged user)
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
router.get("/language", async (req, res) => {
    try {
        const { id } = req.query;
        if(!id) throw new Error("API.INVALID_REQUEST");
        
        if(id != req.id)
        throw new Error("API.INVALID_CREDENTIALS");

        const data = await userTable.findByPk(id, { attributes: [ 'language' ] });
        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /user:
 *   put:
 *     summary: Update user
 *     tags: [User]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID (only will update the user if the ID is the same as the logged user)
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

        if(!id)
        throw new Error("API.INVALID_REQUEST");

        if(id != req.id)
        throw new Error("API.INVALID_CREDENTIALS");

        if(req.body.updatedAt) delete req.body["updatedAt"];
        if(req.body.createdAt) delete req.body["createdAt"];
        if(req.body.role) delete req.body["role"];
        if(req.body.status) delete req.body["status"];
        if(req.body.id_plan) delete req.body["id_plan"];
        if(req.body.plan_expire_date) delete req.body["plan_expire_date"];
        if(req.body.stripe_customer_id) delete req.body["stripe_customer_id"];

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
 * /user:
 *   delete:
 *     summary: Delete user
 *     tags: [User]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID (only will delete the user if the ID is the same as the logged user)
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
        
        if(!id)
        throw new Error("API.INVALID_REQUEST");

        if(id != req.id)
        throw new Error("API.INVALID_CREDENTIALS");

        const data = await userTable.findByPk(id);
        await data.destroy();

        res.json(true);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;