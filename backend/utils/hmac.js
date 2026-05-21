const crypto = require("crypto"); // Módulo nativo do Node.js para operações criptográficas

// Chave secreta usada para assinar o HMAC, lida a partir das variáveis de ambiente
const SECRET_KEY = process.env.SECRET_KEY;

// Garante que a aplicação não arranca sem a chave secreta definida
if (!SECRET_KEY) {
    throw new Error("SECRET_KEY não definida");
}

// Gera um hash HMAC-SHA256 a partir do token e do email do utilizador
// Usado para verificar a autenticidade do token sem o armazenar em texto simples
function hashToken(token, email) {
    return crypto
        .createHmac("sha256", process.env.SECRET_KEY) // Cria um HMAC usando SHA256 e a chave secreta
        .update(token + email)                         //token + email como dados a assinar
        .digest("hex");                                // Devolve o resultado em formato hexadecimal
}

// Exporta a função para ser utilizada noutros módulos da aplicação
module.exports = { hashToken };