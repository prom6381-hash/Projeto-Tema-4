const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

//enviar email com token

async function sendTokenEmail(email, token) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "VotoSeguro - Token de autenticação",
            text: `O teu token de autenticação é: ${token}. Este token expira em poucos minutos`,
        });
        console.log(`Email enviado para ${email}`);
    } catch (error) {
        console.error(`Erro ao enviar email para ${email}:`, error);
    }
}

module.exports = {
    sendTokenEmail,
};