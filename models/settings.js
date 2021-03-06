'use strict'

var mongoose = require('mongoose');
mongoose.Promise = require('q').Promise;

var schema = new mongoose.Schema({
    price_3_months: Number,
    price_12_months: Number,
    commission_3_months: Number,
    commission_12_months: Number,
    trial_days: Number,
    exam_duration: Number,
    default_pass_score: Number
});

mongoose.model('Settings', schema);

module.exports = function(connection) {
    return (connection || mongoose).model('Settings');
};