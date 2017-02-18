'use strict'

var mongoose = require('mongoose');
mongoose.Promise = require('q').Promise;

var schema = new mongoose.Schema({
    certificate_id: String,
    name: String,
    date: { type: Date },
    content: String
});

schema.index({ date: 1 });
schema.index({ name: 1, certificate_id: 1 });
mongoose.model('Certificate', schema);

module.exports = function(connection) {
    return (connection || mongoose).model('Certificate');
};