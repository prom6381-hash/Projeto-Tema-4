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
        required: true,
    },  

    passwordHash: {
        type: String,
        required: true
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    certificate: {
        type: String,
        required: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("User", UserSchema);