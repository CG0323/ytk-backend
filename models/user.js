'use strict'

var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var schema = new mongoose.Schema({
    username: String,
    password: String,
    name: String,
    role: String,
    created_at: { type: Date },
    updated_at: { type: Date }
});

schema.plugin(passportLocalMongoose);

schema.pre('save', function(next) {
    var now = new Date();
    this.updated_at = now;
    if (!this.created_at) {
        this.created_at = now;
    }
    next();
});

mongoose.model('User', schema);

module.exports = function(connection) {
    return (connection || mongoose).model('User');
};