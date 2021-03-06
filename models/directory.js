'use strict'

var mongoose = require('mongoose');
mongoose.Promise = require('q').Promise;

var schema = new mongoose.Schema({
    name: String,
    level: Number,
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Directory' },
    exam_pass_score: Number,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, //when created by teacher, put teacher user id here
    online : Boolean,
});

var deepPopulate = require('mongoose-deep-populate')(mongoose);
schema.plugin(deepPopulate);
schema.index({ parent: 1 });

mongoose.model('Directory', schema);

module.exports = function(connection) {
    return (connection || mongoose).model('Directory');
};