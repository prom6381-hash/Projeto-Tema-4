const crypto = require("crypto"); // Módulo nativo do Node.js para operações criptográficas

// Gera um token aleatório e seguro para autenticação
function generateToken() {
    return crypto.randomBytes(32).toString("hex"); // Gera 32 bytes aleatórios e converte para hexadecimal
}

// Exporta a função para ser utilizada noutros módulos da aplicação
module.exports = { generateToken };