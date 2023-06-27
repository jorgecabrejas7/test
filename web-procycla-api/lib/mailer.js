const nodemailer = require("nodemailer");
require("dotenv").config();

//create mail transporter
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
});

//send mail
const sendMail = async mail => {
    try {
        const info = await transporter.sendMail(mail);
        return info;
    } catch (error) {
        throw error;
    }
};

module.exports = sendMail;