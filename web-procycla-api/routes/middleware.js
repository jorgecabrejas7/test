const moment = require('moment'); 
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { user: userTable, session: sessionTable } = require("../lib/db");

const setDefaultHeaders = (res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Accept, Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
};

const middleware = (req, res, next) => {
    setDefaultHeaders(res);
    if(req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
    }
    next();
};

const protectedMiddleware = (req, res, next) => {
    setDefaultHeaders(res);
    if(req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
    }

    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if(!token) throw new Error("API.INVALID_CREDENTIALS");

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (error, decoded) => {
            try {
                if(error) throw new Error("API.INVALID_CREDENTIALS");

                const { id, email, role, session } = decoded;

                const sessionData = await sessionTable.findByPk(session);
                if(!sessionData || !sessionData.valid) throw new Error("API.INVALID_CREDENTIALS");

                //session logic
                let expiresDate = moment(sessionData.createdAt, process.env.DATE_FORMAT || 'DD/MM/YYYY h:mm:ss').toDate(), currentDate = new Date();
                expiresDate.setDate(expiresDate.getDate() + parseInt(sessionData.expires_in.replace('d', '')));
                
                const diff = expiresDate - currentDate;
                if(diff <= 0) {
                    await sessionData.update({ valid: false });
                    throw new Error("API.INVALID_CREDENTIALS");
                }

                const data = await userTable.findByPk(id);
                if(!data) throw new Error("API.INVALID_CREDENTIALS");

                if(data.status === "banned")
                throw new Error("API.BANNED_ACCOUNT");
                
                req.id = id;
                req.email = email;
                req.role = role;
                req.session = session;
                next();
            }
            catch(error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
};

const protectedAdministrativeMiddleware = (req, res, next) => {
    setDefaultHeaders(res);
    if(req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
    }

    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if(!token) throw new Error("API.INVALID_CREDENTIALS");

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (error, decoded) => {
            try {
                if(error) throw new Error("API.INVALID_CREDENTIALS");

                const { id, email, role, session } = decoded;

                const sessionData = await sessionTable.findByPk(session);
                if(!sessionData || !sessionData.valid) throw new Error("API.INVALID_CREDENTIALS");

                //session logic
                let expiresDate = moment(sessionData.createdAt, process.env.DATE_FORMAT || 'DD/MM/YYYY h:mm:ss').toDate(), currentDate = new Date();
                expiresDate.setDate(expiresDate.getDate() + parseInt(sessionData.expires_in.replace('d', '')));
                
                const diff = expiresDate - currentDate;
                if(diff <= 0) {
                    await sessionData.update({ valid: false });
                    throw new Error("API.INVALID_CREDENTIALS");
                }

                const data = await userTable.findByPk(id);
                if(!data) throw new Error("API.INVALID_CREDENTIALS");

                if(data.status === "banned")
                throw new Error("Account banned");

                if(!data.role || data.role != "admin")
                throw new Error("API.INVALID_CREDENTIALS");
                
                req.id = id;
                req.email = email;
                req.role = role;
                req.session = session;
                next();
            }
            catch(error) {
                res.status(400).json({ message: error.message });
            }
        });
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    middleware,
    protectedMiddleware,
    protectedAdministrativeMiddleware
};