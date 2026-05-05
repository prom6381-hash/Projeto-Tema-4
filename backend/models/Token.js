const mondoose = require('mongoose');

const TokenSchema = new mondoose.Schema({
    email: { type: String, required: true, index: true }, // Índice para consultas rápidas
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true }
});

module.exports = mondoose.model('Token', TokenSchema);