require("dotenv").config();
const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { user: userTable, session: sessionTable } = require("../lib/db");
const bcrypt = require("bcrypt");
const sendMail = require("../lib/mailer");

const { middleware } = require("./middleware");
router.use(middleware);

const generateAccessToken = (data, sessionId) => {
    return jwt.sign({ id: data.id, email: data.email, role: data.role, session: sessionId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN });
};

const generateRandomCode = () => {
    const n = 6;
    var add = 1, max = 12 - add;
    
    if(n > max) {
        return generate(max) + generate(n - max);
    }
    
    max        = Math.pow(10, n + add);
    var min    = max / 10;
    var number = Math.floor(Math.random() * (max - min + 1)) + min;
    
    return ("" + number).substring(add); 
};

/**
 * @openapi
 * /auth/token:
 *   get:
 *     summary: Get access token
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: User email
 *       - in: query
 *         name: password
 *         schema:
 *           type: string
 *         required: true
 *         description: User password
 *     responses:
 *       200:
 *         description: Access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                 session:
 *                   type: integer
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get("/token", async (req, res) => {
    try {
        const clientIp = req.clientIp.replace('::ffff:', '');
        if(!clientIp) throw new Error("API.INVALID_REQUEST");
        
        const userAgent = req.useragent;
        if(!userAgent) throw new Error("API.INVALID_REQUEST");

        const { email, password } = req.query;
        if(!email || !password) throw new Error("API.INVALID_REQUEST");
        
        const data = await userTable.findOne({ where: { email: email } });
        if(!data) throw new Error("API.INVALID_CREDENTIALS");
        if(data.status === "banned") throw new Error("API.BANNED_ACCOUNT");

        const match = await bcrypt.compare(password, data.password);
        if(!match) throw new Error("API.INVALID_CREDENTIALS");

        //if user has enabled 2FA, check if the IP is in the user session table
        if(data.secure_login_email) {
            const session = await sessionTable.findOne({ where: { id_user: data.id, ip: clientIp } });
            //if(!session) {
                const code = generateRandomCode();
                data.secure_login_code = code;
                await data.save();

                let subject = "Procycla - Secure login";
                let text = `Your secure login code is: ${ code }`;
                switch(data.language.toLowerCase()) {
                    case 'es':
                        subject = "Procycla - Inicio de sesión seguro";
                        text = `Su código de inicio de sesión seguro es: ${ code }`;
                        break;
                }

                const mail = {
                    from: 'Procycla',
                    to: data.email,
                    subject: subject,
                    text: text
                };
                await sendMail(mail);
                throw new Error("2FA");
            //}
        }
        
        const sessionDevice = `${ userAgent.platform } ${ userAgent.os } (${ userAgent.browser } ${ userAgent.version })`;
        const userSession = await sessionTable.create({ id_user: data.id, valid: true, expires_in: process.env.ACCESS_TOKEN_EXPIRES_IN, device: sessionDevice, ip: clientIp });
        
        const accessToken = generateAccessToken(data, userSession.id);
        res.json({ id: data.id, email: data.email, role: data.role, session: userSession.id, accessToken: accessToken });
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});

router.get("/token/2fa", async (req, res) => {
    try {
        const clientIp = req.clientIp.replace('::ffff:', '');
        if(!clientIp) throw new Error("API.INVALID_REQUEST");

        const userAgent = req.useragent;
        if(!userAgent) throw new Error("API.INVALID_REQUEST");

        const { email, password, code } = req.query;
        if(!email || !password || !code) throw new Error("API.INVALID_REQUEST");

        const data = await userTable.findOne({ where: { email: email } });
        if(!data || !data.secure_login_email) throw new Error("API.INVALID_CREDENTIALS");

        const match = await bcrypt.compare(password, data.password);
        if(!match) throw new Error("API.INVALID_CREDENTIALS");

        if(!data.secure_login_code || data.secure_login_code !== code) {
            throw new Error("API.INVALID_CREDENTIALS");
        }
        else {
            data.secure_login_code = null;
            await data.save();
            
            const sessionDevice = `${ userAgent.platform } ${ userAgent.os } (${ userAgent.browser } ${ userAgent.version })`;
            const userSession = await sessionTable.create({ id_user: data.id, valid: true, expires_in: process.env.ACCESS_TOKEN_EXPIRES_IN, device: sessionDevice, ip: clientIp });
            
            const accessToken = generateAccessToken(data, userSession.id);
            res.json({ id: data.id, email: data.email, role: data.role, session: userSession.id, accessToken: accessToken });
        }
    }
    catch(error) {
        res.status(400).json({ message: error.message });
    }
});



module.exports = router;