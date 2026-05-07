const mondoose = require('mongoose');

// Esquema para armazenar tokens de autenticação na BD
const TokenSchema = new mondoose.Schema({
    email: { type: String, required: true, index: true }, // Índice para consultas rápidas
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    tokenType: { type: String, enum: ["login", "register", "vote", "create"], required: true,} 
});

module.exports = mondoose.model('Token', TokenSchema);