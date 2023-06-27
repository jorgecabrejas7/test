const router = require("express").Router();
const { ticket: ticketTable } = require("../../lib/db");
const { ticketMessage: ticketMessageTable } = require("../../lib/db");
const { user: userTable } = require("../../lib/db");
const { protectedMiddleware } = require("../middleware");
const { Op } = require("sequelize");

//PROTECTED ROUTES
router.use(protectedMiddleware);

/**
 * @openapi
 * /ticket:
 *   post:
 *     summary: Create ticket
 *     tags: [Ticket]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Ticket'
 *     responses:
 *       200:
 *         description: Ticket created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", async (req, res) => {
    try {
        const { title, message } = req.body;
        if(!title || !message) throw new Error("API.INVALID_REQUEST");
        const ticket = await ticketTable.create({ title: title, status: 'waiting_response', id_user: req.id });
        await ticketMessageTable.create({ id_ticket: ticket.id, id_user: req.id, message: message });
        res.json(ticket);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /ticket:
 *   get:
 *     summary: Get ticket or list of tickets created by the user
 *     tags: [Ticket]
 *     parameters:
 *       - in: query
 *         name: id_ticket
 *         schema:
 *           type: integer
 *         required: false
 *         description: Ticket ID (only will return the ticket if the ticket is created by the logged user or is a public ticket) or null to return all tickets created by the user
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
 *         description: Ticket
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", async (req, res) => {
    try {
        const { id_ticket } = req.query;
        if(id_ticket) {
            const ticket = await ticketTable.findByPk(id_ticket, {
                include: [
                    {
                        model: userTable,
                        required: true,
                        attributes: ['email']
                    }
                ]
            });
            if(!ticket) throw new Error("API.INVALID_REQUEST");
            if(ticket.type === 'ticket' && ticket.id_user != req.id) throw new Error("API.INVALID_CREDENTIALS");
            res.json(ticket);
        }
        else {
            const user = await userTable.findByPk(req.id);
            let subscriptions = [ { id: req.id }, { type: 'ticket' } ];
            if(user.notification_monthly_digest) subscriptions.push({ type: 'monthly_digest' });
            if(user.notification_product_updates) subscriptions.push({ type: 'product_updates' });
            if(user.notification_discount_and_promotions) subscriptions.push({ type: 'discount_and_promotions' });

            const { page_size = 30, page = 0 } = req.query;
            const total_count = await ticketTable.count({ where: { [Op.or]: subscriptions } });

            const data = await ticketTable.findAll({
                where: {
                    [Op.or]: subscriptions
                },
                limit: parseInt(page_size),
                offset: parseInt(page) * parseInt(page_size),
                order: [ ['createdAt', 'DESC'] ]
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
 * /ticket:
 *   put:
 *     summary: Update ticket created by the logged user
 *     tags: [Ticket]
 *     parameters:
 *       - in: query
 *         name: id_ticket
 *         schema:
 *           type: integer
 *         required: true
 *         description: Ticket ID (only will update the ticket if the ticket is created by the logged user)
 *     responses:
 *       200:
 *         description: Ticket
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/", async (req, res) => {
    try {
        const { id_ticket } = req.query;
        if(!id_ticket) throw new Error("API.INVALID_REQUEST");

        if(req.body.updatedAt) delete req.body["updatedAt"];
        if(req.body.createdAt) delete req.body["createdAt"];

        const data = await ticketTable.findByPk(id_ticket);
        if(data.id_user != req.id) throw new Error("API.INVALID_CREDENTIALS");

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
 * /ticket/message:
 *   post:
 *     summary: Create a new message for a ticket created by the logged user
 *     tags: [Ticket]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TicketMessage'
 *     parameters:
 *       - in: query
 *         name: id_ticket
 *         schema:
 *           type: integer
 *         required: true
 *         description: Ticket ID (only will create the message if the ticket is created by the logged user)
 *     responses:
 *       200:
 *         description: TicketMessage
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TicketMessage'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/message", async (req, res) => {
    try {
        const { message } = req.body;
        if(!message) throw new Error("API.INVALID_REQUEST");

        const { id_ticket } = req.query;
        if(!id_ticket) throw new Error("API.INVALID_REQUEST");

        const ticket = await ticketTable.findByPk(id_ticket);
        if(!ticket) throw new Error("API.INVALID_REQUEST");
        if(ticket.id_user != req.id) throw new Error("API.INVALID_CREDENTIALS");

        if(ticket.status === "finished")
        throw new Error("API.INVALID_REQUEST");

        const data = await ticketMessageTable.create({ message: message, id_ticket: ticket.id, id_user: req.id });
        ticket.status = "waiting_response";
        await ticket.save();
        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /ticket/messages:
 *   get:
 *     summary: List all messages for a ticket created by the logged user
 *     tags: [Ticket]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TicketMessage'
 *     parameters:
 *       - in: query
 *         name: id_ticket
 *         schema:
 *           type: integer
 *         required: true
 *         description: Ticket ID (only will create the message if the ticket is created by the logged user)
 *     responses:
 *       200:
 *         description: TicketMessage
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TicketMessage'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/messages/", async (req, res) => {
    try {
        const { id_ticket } = req.query;
        if(!id_ticket) throw new Error("API.INVALID_REQUEST");

        const ticket = await ticketTable.findByPk(id_ticket);
        if(!ticket) throw new Error("API.INVALID_REQUEST");
        if(ticket.type === 'ticket' && ticket.id_user != req.id) throw new Error("API.INVALID_CREDENTIALS");
        
        const data = await ticketMessageTable.findAll({
            where: { id_ticket: ticket.id },
            order: [ ['createdAt', 'ASC'] ],
            include: [
                {
                    model: userTable,
                    required: true,
                    attributes: ['email']
                }
            ]
        });
        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;