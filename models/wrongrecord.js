'use strict'

var mongoose = require('mongoose');
mongoose.Promise = require('q').Promise;

var schema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
});

schema.index({ user: 1 });
mongoose.model('WrongRecord', schema);

module.exports = function(connection) {
    return (connection || mongoose).model('WrongRecord');
};