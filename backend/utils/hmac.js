const crypto = require("crypto");


const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
    throw new Error("SECRET_KEY não definida");
}

function hashToken(token, email) {
    return crypto
        .createHmac("sha256", process.env.SECRET_KEY)
        .update(token + email)
        .digest("hex");
}

module.exports = { hashToken };