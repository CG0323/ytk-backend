'use strict'

var mongoose = require('mongoose');
mongoose.Promise = require('q').Promise;

var schema = new mongoose.Schema({
    directory_path: String, //微信订单号
    created_at: { type: Date },
    updated_at: { type: Date },
    submitter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submitter_name: String,
    description: String,
    status: String, //已提交,已分析,已解决
    comments: [{ content: String, by: String }],
});

schema.pre('save', function(next) {
    var now = new Date();
    this.updated_at = now;
    if (!this.created_at) {
        this.created_at = now;
    }
    next();
});

schema.index({ submitter: 1, status: 1 });
mongoose.model('Issue', schema);

module.exports = function(connection) {
    return (connection || mongoose).model('Issue');
};