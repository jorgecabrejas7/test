const router = require("express").Router();
const { protectedAdministrativeMiddleware } = require("../middleware");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const moment = require('moment'); 

//PROTECTED ADMINISTRATIVE ROUTES
router.use(protectedAdministrativeMiddleware);

/**
 * @openapi
 * /admin/stripe/cancel_subscription:
 *   get:
 *     description: This only works for admin users
 *     summary: Cancel user subscription
 *     tags: [Admin Stripe]
 *     parameters:
 *       - in: query
 *         name: id_subscription
 *         schema:
 *           type: integer
 *         required: true
 *         description: Subscription ID
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
        const { id_subscription } = req.query;
        if(!id_subscription) throw new Error("API.INVALID_REQUEST");
        
        await stripe.subscriptions.del(id_subscription);
        res.json(true);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /admin/stripe/subscriptions:
 *   get:
 *     description: This only works for admin users
 *     summary: List subscriptions
 *     tags: [Admin Stripe]
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
 *         description: Subscription list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Total count of subscriptions
 *                 list:
 *                   type: object
 *                   description: List of subscriptions
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Invoice id
 *                     date:
 *                       type: string
 *                     user:
 *                       type: string
 *                       description: User email
 *                     plan:
 *                       type: string
 *                       description: Plan name (translation key)
 *                     status:
 *                       type: string
 *                       description: Status of subscription
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/subscriptions", async (req, res) => {
    try {
        const { page_size = 30, starting_after, ending_before } = req.query;

        let listObject = { status: 'all', limit: page_size };
        if(starting_after) listObject = { ...listObject, starting_after: starting_after };
        if(ending_before) listObject = { ...listObject, ending_before: ending_before };
        listObject = { ...listObject, expand: ["total_count"] };

        let subscriptionsRes = [];
        let subscriptions = await stripe.subscriptions.list(listObject);
        for (let index = 0; index < subscriptions.data.length; index++) {
            const subscription = subscriptions.data[index];
            const customer = await stripe.customers.retrieve(subscription.customer);
            subscription.customer_email = customer.email;
            
            subscriptionsRes.push({
                id: subscription.id,
                date: moment(moment.unix(subscription.created)).format(process.env.DATE_FORMAT || 'DD/MM/YYYY h:mm:ss'),
                user: subscription.customer_email,
                plan: 'PLANS.ID_' + subscription?.metadata?.id_plan + '.NAME',
                status: subscription.status
            });
        }
        
        res.json({ count: subscriptions.total_count, list: subscriptionsRes });
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /admin/stripe/payments:
 *   get:
 *     description: This only works for admin users
 *     summary: List payments
 *     tags: [Admin Stripe]
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
 *         description: Payments list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Total count of payments
 *                 list:
 *                   type: object
 *                   description: List of payments
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Invoice id
 *                     date:
 *                       type: string
 *                     user:
 *                       type: string
 *                       description: User email
 *                     total:
 *                       type: number
 *                       description: Total amount
 *                     status:
 *                       type: string
 *                       description: Status of payment
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/payments", async (req, res) => {
    try {
        const { page_size = 30, starting_after, ending_before } = req.query;

        let listObject = { limit: page_size };
        if(starting_after) listObject = { ...listObject, starting_after: starting_after };
        if(ending_before) listObject = { ...listObject, ending_before: ending_before };
        listObject = { ...listObject, expand: ["total_count"] };

        let paymentsRes = [];
        const payments = await stripe.paymentIntents.list(listObject);

        for (let index = 0; index < payments.data.length; index++) {
            const payment = payments.data[index];
            const customer = await stripe.customers.retrieve(payment.customer);
            payment.customer_email = customer.email;

            paymentsRes.push({
                id: payment.id,
                date: moment(moment.unix(payment.created)).format(process.env.DATE_FORMAT || 'DD/MM/YYYY h:mm:ss'),
                user: payment.customer_email,
                total: `${ payment.amount / 100 } ${ payment.currency.toUpperCase() }`,
                status: payment.status
            });
        }
        res.json({ count: payments.total_count, list: paymentsRes });
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;