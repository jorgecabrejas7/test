//Includes
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const requestIp = require("request-ip");
const useragent = require("express-useragent");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const swaggerOptions = require("./lib/swagger");
const fileUpload = require("express-fileupload");

//Express configuration
const app = express();
app.use(express.json({ limit: '500mb' }));
app.set("trust proxy", "loopback");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(requestIp.mw());
app.use(useragent.express());

//Swagger
const specs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

//Router
const router = require("./routes/index");

//DB connection
require("./lib/db");

//File Upload
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: (process.env.FILES_PATH || "files") + "/tmp"
}));

//Run
app.listen(process.env.APP_PORT, () => {
    app.use("/", router);
    console.log("OK! Server listening at port: " + process.env.APP_PORT);
});