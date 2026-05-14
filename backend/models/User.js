const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    salt: {
        type: String,
    },  

    passwordHash: {
        type: String,
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    certificate: {
        type: String,
        required: false
    },

    chavePublicaRSA:{
        type: String,
        required: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("User", UserSchema);