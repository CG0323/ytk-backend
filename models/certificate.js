'use strict'

var mongoose = require('mongoose');
mongoose.Promise = require('q').Promise;

var schema = new mongoose.Schema({
    certificate_id: String,
    name: String,
    date: { type: Date },
    content: String
});

schema.index({ certificate_id: "text", name: "text" });
mongoose.model('Certificate', schema);

module.exports = function(connection) {
    return (connection || mongoose).model('Certificate');
};