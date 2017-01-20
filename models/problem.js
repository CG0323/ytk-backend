'use strict'

var mongoose = require('mongoose');
mongoose.Promise = require('q').Promise;

var schema = new mongoose.Schema({
    name: String,
    sgf: String,
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Directory' }
});

schema.index({ parent: 1 });
mongoose.model('Problem', schema);

module.exports = function(connection) {
    return (connection || mongoose).model('Problem');
};