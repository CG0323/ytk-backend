'use strict'

var mongoose = require('mongoose');
mongoose.Promise = require('q').Promise;

var schema = new mongoose.Schema({
    out_trade_no: String, //自己生成的订单号
    transaction_id: String, //微信订单号
    order_date: { type: Date },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    payer_name: String,
    total_fee: Number,
    package: String, //12月,3月
    student_usernames: String,
    student_names: String
});


schema.index({ out_trade_no: 1, user: 1 });
mongoose.model('Order', schema);

module.exports = function(connection) {
    return (connection || mongoose).model('Order');
};