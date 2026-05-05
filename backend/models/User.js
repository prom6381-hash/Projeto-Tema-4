const { lowerCase, trim, create } = require('lodash');
const mondoose = require('mongoose');
const { Certificate } = require('node:crypto');
const { is } = require('type-is');

const UserSchema = new mondoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowerCase: true, 
        trim: true },
    
    isVerified: { type: Boolean, default: false },

    Certificate: { type: String, required: false },

    createdAt: { type: Date, default: Date.now }
}); 

module.exports = mondoose.model('User', UserSchema);    