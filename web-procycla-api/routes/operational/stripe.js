const router = require("express").Router();
const { plan: planTable, user: userTable } = require("../../lib/db");
const { getCurrentProductIdFromIdPlan } = require("../../lib/stripeStore");
const { protectedMiddleware } = require("../middleware");
const { literal } = require("sequelize");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const moment = require('moment'); 

const cancelUserSubscriptions = async (user) => {
    try {
        if(!user.stripe_customer_id) throw new Error("no customer id");
        const userSubscriptions = await stripe.subscriptions.list({ customer: user.stripe_customer_id, status: 'active', limit: 100 });
        const subscriptions = userSubscriptions.data;
        for (let index = 0; index < subscriptions.length; index++) {
            const subscription = subscriptions[index];
            await stripe.subscriptions.del(subscription.id);
        }
        return true;
    }
    catch(error) {
        return false;
    }
};

const deleteUserPaymentMethods = async (user) => {
    try {
        if(!user.stripe_customer_id) throw new Error("no customer id");

        const userPaymentMethods = await stripe.paymentMethods.list({ customer: user.stripe_customer_id, type: 'card', limit: 100 });
        const paymentMethods = userPaymentMethods.data;
        for (let index = 0; index < paymentMethods.length; index++) {
            const paymentMethod = paymentMethods[index];
            await stripe.paymentMethods.detach(paymentMethod.id);
        }

        await cancelUserSubscriptions(user);
        return true;
    }
    catch(error) {
        return { ok: false };
    }
};

const chargeUserPlan = async (user, plan, auto_renewal) => {
    try {
        if(!user.stripe_customer_id) throw new Error("no customer id");

        const { data } = await stripe.paymentMethods.list({ customer: user.stripe_customer_id, type: 'card', limit: 100 });
        const paymentMethod = data[0];
        if(!paymentMethod) throw new Error("no payment method");

        const canceled = await cancelUserSubscriptions(user);
        if(!canceled) throw new Error("cannnot cancel old user subscriptions");

        const theProducts = await stripe.products.list({ limit: 100 });
        const currentProducts = theProducts.data;
        const currentProductId = getCurrentProductIdFromIdPlan(currentProducts, plan.id);
        
        if(currentProductId == -1)
        throw new Error("product not found");

        let price = null;
        const prices = await stripe.prices.list({ product: currentProductId, active: true, limit: 100 });
        if(prices.data.length > 0)
        price = prices.data[0];
        
        if(!price)
        throw new Error("price not found")

        const subscription = await stripe.subscriptions.create({
            customer: user.stripe_customer_id,
            default_payment_method: paymentMethod.id,
            items: [ { price: price.id } ],
            payment_behavior: 'error_if_incomplete',
            metadata: { id_plan: plan.id },
            cancel_at_period_end: auto_renewal == 'true' ? false : true
        });

        const { id } = subscription;
        if(!id) throw new Error("no subscription id");
        
        return true;
    }
    catch(error) {
        return false;
    }
};

//PROTECTED ROUTES
router.use(protectedMiddleware);

/**
 * @openapi
 * /stripe/set_customer:
 *   get:
 *     summary: Upsert logged user stripe customer
 *     tags: [Stripe]
 *     responses:
 *       200:
 *         description: Stripe customer id
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stripe_customer_id:
 *                   type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/set_customer", async (req, res) => {
    try {
        const user = await userTable.findByPk(req.id);
        if(!user) throw new Error("API.INVALID_REQUEST");

        let stripe_customer_id = null;
        if(user.stripe_customer_id) {
            stripe_customer_id = user.stripe_customer_id;
            await stripe.customers.update(user.stripe_customer_id, {
                email: user.email,
                description: user.username,
                name: user.firstname + ' ' + user.lastname,
                phone: user.phone,
                address: user.location,
                metadata: { id_user: user.id }
            });
        }
        else {
            const customer = await stripe.customers.create({
                email: user.email,
                description: user.username,
                name: user.firstname + ' ' + user.lastname,
                phone: user.phone,
                address: user.location,
                metadata: { id_user: user.id }
            });
            
            user.stripe_customer_id = customer.id;
            stripe_customer_id = customer.id;
            await user.save();
        }

        res.json({ stripe_customer_id: stripe_customer_id });
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /stripe/delete_card:
 *   get:
 *     summary: Delete logged user payment methods
 *     tags: [Stripe]
 *     responses:
 *       200:
 *         description: True if deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: boolean
 *               example: true
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/delete_card", async (req, res) => {
    try {
        const user = await userTable.findByPk(req.id);
        if(!user || !user.stripe_customer_id) throw new Error("API.INVALID_REQUEST");

        const deleted = await deleteUserPaymentMethods(user);
        if(!deleted)
        throw new Error("API.INTERNAL_ERROR");

        res.json(deleted);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /stripe/setup_card:
 *   get:
 *     summary: Setup logged user payment method
 *     tags: [Stripe]
 *     responses:
 *       200:
 *         description: Stripe client secret
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 client_secret:
 *                   type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/setup_card", async (req, res) => {
    try {
        const user = await userTable.findByPk(req.id);
        if(!user || !user.stripe_customer_id) throw new Error("API.INVALID_REQUEST");

        const setupIntent = await stripe.setupIntents.create({
            customer: user.stripe_customer_id,
            payment_method_types: ['card'],
        });
        
        if(!setupIntent || !setupIntent?.client_secret)
        throw new Error("API.INTERNAL_ERROR");

        res.json({ client_secret: setupIntent.client_secret });
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /stripe/charge_plan:
 *   get:
 *     summary: Charge logged user plan
 *     tags: [Stripe]
 *     responses:
 *       200:
 *         description: True if charged successfully else false
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                   description: True if charged successfully else false
 *                 message:
 *                   type: string
 *                   description: Error message if ok is false
 */
router.get("/charge_plan", async (req, res) => {
    try {
        const { id_user, id, auto_renewal } = req.query;
        if(!id_user) throw new Error("API.INVALID_REQUEST");
        if(req.id != id_user) throw new Error("API.INVALID_CREDENTIALS");

        if(!id) throw new Error("API.INVALID_REQUEST");

        const user = await userTable.findByPk(id_user);
        if(!user) throw new Error("API.INVALID_REQUEST");
        
        const plan = await planTable.findByPk(id);
        if(!plan) throw new Error("API.INVALID_REQUEST");
        
        const charge = await chargeUserPlan(user, plan, auto_renewal);

        if(!charge)
        throw new Error("API.INTERNAL_ERROR");

        await userTable.update(
          {
            id_plan: plan.id,
            plan_expire_date: literal("date_add(now(), interval " + plan.duration_days + " day)")
          },
          { where: { id: user.id } }
        );
        res.json({ ok: true });
    }
    catch(error) {
        res.status(200).json({ ok: false, message: error.message });
    }
});

/**
 * @openapi
 * /stripe/cancel_subscription:
 *   get:
 *     summary: Cancel logged user subscription
 *     tags: [Stripe]
 *     responses:
 *       200:
 *         description: True if subscription canceled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                   description: True if charged successfully else false
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/cancel_subscription", async (req, res) => {
    try {
        const { id_user } = req.query;
        if(!id_user) throw new Error("API.INVALID_REQUEST");
        if(req.id != id_user) throw new Error("API.INVALID_CREDENTIALS");

        const user = await userTable.findByPk(id_user);
        if(!user) throw new Error("API.INVALID_REQUEST");
        
        const canceled = await cancelUserSubscriptions(user);
        if(!canceled) throw new Error("API.INVALID_REQUEST");

        res.json({ ok: true });
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /stripe/get_invoices:
 *   get:
 *     summary: Get logged user invoices
 *     tags: [Stripe]
 *     parameters:
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *           example: 30
 *         required: false
 *         description: default 30
 *       - in: query
 *         name: starting_after
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: ending_before
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       200:
 *         description: Invoice list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Total count of user invoices
 *                 list:
 *                   type: object
 *                   description: List of user invoices
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Invoice id
 *                     id_user:
 *                       type: integer
 *                       description: User id
 *                     invoice_url:
 *                       type: string
 *                       description: Invoice url
 *                     title:
 *                       type: string
 *                       description: Invoice title
 *                     total:
 *                       type: number
 *                       description: Invoice total amount
 *                     transaction_id:
 *                       type: string
 *                       description: Transaction id
 *                     updatedAt:
 *                       type: string
 *                       description: Invoice date
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/get_invoices", async (req, res) => {
    try {
        const user = await userTable.findByPk(req.id);
        if(!user || !user.stripe_customer_id) throw new Error("API.INVALID_REQUEST");

        const { page_size = 30, starting_after, ending_before } = req.query;

        let listObject = { customer: user.stripe_customer_id, limit: page_size };
        if(starting_after) listObject = { ...listObject, starting_after: starting_after };
        if(ending_before) listObject = { ...listObject, ending_before: ending_before };
        listObject = { ...listObject, expand: ["total_count"] };

        let invoiceList = [];
        const invoices = await stripe.invoices.list(listObject);
        for (let index = 0; index < invoices.data.length; index++) {
            const invoice = invoices.data[index];
            
            let id_plan = null;
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            if(subscription?.metadata?.id_plan) id_plan = subscription.metadata.id_plan;
            
            const isRenewal = !(invoice.created == subscription.created);

            invoiceList.push({
                id: invoice.id,
                id_user: req.id,
                invoice_url: invoice.invoice_pdf,
                title: id_plan ? ('PLANS.ID_' + id_plan + '.' + (isRenewal ? 'RENEWAL' : 'PURCHASE')) : '',
                total: `${ invoice.amount_paid / 100 } ${ invoice.currency.toUpperCase() }`,
                transaction_id: invoice.id,
                updatedAt: moment(moment.unix(invoice.created)).format(process.env.DATE_FORMAT || 'DD/MM/YYYY h:mm:ss'),

            });
        }
        res.json({ count: invoices.total_count, list: invoiceList });
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;