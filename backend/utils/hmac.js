const crypto = require("crypto");

function hashToken(token, email) {
    return crypto
        .createHmac("sha256", process.env.SECRET_KEY)
        .update(token + email)
        .digest("hex");
}

module.exports = { hashToken };