'use strict'

var mongoose = require('mongoose');
mongoose.Promise = require('q').Promise;

var schema = new mongoose.Schema({
    name: String,
    level: Number,
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Directory' }
});

schema.index({ parent: 1 });

mongoose.model('Directory', schema);

module.exports = function(connection) {
    return (connection || mongoose).model('Directory');
};