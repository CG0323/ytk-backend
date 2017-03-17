'use strict'

var mongoose = require('mongoose');
mongoose.Promise = require('q').Promise;

var schema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sequence: Number = 1
});

schema.index({ user: 1 });
mongoose.model('Sequence', schema);

module.exports = function(connection) {
    return (connection || mongoose).model('Sequence');
};