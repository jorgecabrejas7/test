const router = require("express").Router();
const { ticket: ticketTable } = require("../../lib/db");
const { ticketMessage: ticketMessageTable } = require("../../lib/db");
const { user: userTable } = require("../../lib/db");
const { protectedAdministrativeMiddleware } = require("../middleware");

//PROTECTED ADMINISTRATIVE ROUTES
router.use(protectedAdministrativeMiddleware);

/**
 * @openapi
 * /admin/ticket:
 *   post:
 *     description: This only works for admin users
 *     summary: Create ticket or notification
 *     tags: [Admin Ticket]
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
        const { title, message, type } = req.body;
        if(!title || !message || !type) throw new Error("API.INVALID_REQUEST");
        const ticket = await ticketTable.create({ title: title, status: 'finished', type: type, id_user: req.id });
        await ticketMessageTable.create({ id_ticket: ticket.id, id_user: req.id, message: message });
        res.json(ticket);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /admin/ticket:
 *   get:
 *     description: This only works for admin users
 *     summary: Get ticket or list of tickets
 *     tags: [Admin Ticket]
 *     parameters:
 *       - in: query
 *         name: id_ticket
 *         schema:
 *           type: integer
 *         required: false
 *         description: Ticket ID
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
            res.json(ticket);
        }
        else {
            const { page_size = 30, page = 0 } = req.query;
            const total_count = await ticketTable.count();

            const data = await ticketTable.findAll({
                limit: parseInt(page_size),
                offset: parseInt(page) * parseInt(page_size),
                order: [ ['createdAt', 'DESC'] ],
                include: [
                    {
                        model: userTable,
                        required: true,
                        attributes: ['email']
                    }
                ]
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
 * /admin/ticket:
 *   put:
 *     description: This only works for admin users
 *     summary: Update ticket
 *     tags: [Admin Ticket]
 *     parameters:
 *       - in: query
 *         name: id_ticket
 *         schema:
 *           type: integer
 *         required: false
 *         description: Ticket ID
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
 * /admin/ticket/message:
 *   post:
 *     description: This only works for admin users
 *     summary: Create a new message for a ticket
 *     tags: [Admin Ticket]
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
 *         required: false
 *         description: Ticket ID
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

        const data = await ticketMessageTable.create({ message: message, id_ticket: ticket.id, id_user: req.id });
        ticket.status = "answered";
        await ticket.save();
        res.json(data);
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @openapi
 * /admin/ticket/messages:
 *   get:
 *     description: This only works for admin users
 *     summary: List all messages for a ticket
 *     tags: [Admin Ticket]
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
 *         description: Ticket ID
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