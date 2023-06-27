const router = require("express").Router();

const authRouter = require("./auth");
const userRouter = require("./operational/user");
const sessionRouter = require("./operational/session");
const ticketRouter = require("./operational/ticket");
const planRouter = require("./operational/plan");
const stripeRouter = require("./operational/stripe");
const projectRouter = require("./operational/project");
const simulationRouter = require("./operational/simulation");
const adminUserRouter = require("./admin/user");
const adminSessionRouter = require("./admin/session");
const adminTicketRouter = require("./admin/ticket");
const adminStripeRouter = require("./admin/stripe");

router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/session", sessionRouter);
router.use("/ticket", ticketRouter);
router.use("/plan", planRouter);
if(process.env.STRIPE_SECRET_KEY) router.use("/stripe", stripeRouter);
router.use("/project", projectRouter);
router.use("/simulation", simulationRouter);
router.use("/admin/user", adminUserRouter);
router.use("/admin/session", adminSessionRouter);
router.use("/admin/ticket", adminTicketRouter);
if(process.env.STRIPE_SECRET_KEY) router.use("/admin/stripe", adminStripeRouter);

module.exports = router;