const nodemailer = require("nodemailer"); // Biblioteca para envio de emails via Node.js

// Configura o transportador de email usando o Gmail como serviço
// As credenciais são lidas a partir do dotenv
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // Endereço de email do remetente
        pass: process.env.EMAIL_PASS, // Palavra-passe da conta de email
    },
});

// Envia um email com o token de autenticação para o utilizador
async function sendTokenEmail(email, token) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,  // Remetente (definido no dotenv)
            to: email,                      // Destinatário
            subject: "VotoSeguro - Token de autenticação", // Assunto do email
            text: `O teu token de autenticação é: ${token}. Este token expira em poucos minutos`, // Corpo do email
        });
        console.log(`Email enviado para ${email}`); // Confirma o envio com sucesso
    } catch (error) {
        // Regista o erro caso o envio falhe, sem interromper a aplicação
        console.error(`Erro ao enviar email para ${email}:`, error);
    }
}

// Exporta a função para ser utilizada noutros módulos da aplicação
module.exports = {
    sendTokenEmail,
};