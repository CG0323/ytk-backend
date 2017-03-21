var express = require('express');
var db = require('../utils/database.js').connection;
var router = express.Router();
var Q = require('q');
var jwt = require('express-jwt');
var config = require('../common.js').config();
var logger = require('../utils/logger.js');
var secretCallback = require('../utils/secretCallback.js').secretCallback;
var Order = require('../models/order')(db);
var User = require('../models/user')(db);
var WXPay = require('node-wxpay');
var fs = require("fs");

var wxpay = WXPay({
    appid: config.wxpay.app_id,
    mch_id: config.wxpay.mch_id,
    partner_key: config.wxpay.partner_key,
    // pfx: fs.readFileSync('./wxpay_cert.p12'),
});

router.post('/prepare', jwt({ secret: secretCallback }), function(req, res) {
    var order = req.body;
    if (order.out_trade_no) { // already created wx order once, need to close it
        closeOrder(order.out_trade_no);
    }
    var out_trade_no = generateOutTradeNo();
    wxpay.createUnifiedOrder({
        body: '弈通康做题软件充值',
        out_trade_no: out_trade_no,
        total_fee: Math.floor(order.total_fee * 100),
        spbill_create_ip: '192.168.2.210',
        notify_url: config.wxpay.notify_url,
        trade_type: 'NATIVE',
        product_id: order.package
    }, function(err, result) {
        if (err) {
            res.status(500).json({ message: err });
        }
        order.out_trade_no = out_trade_no;
        order.user = req.user.iss;
        order.payer_name = req.user.name;
        var insertOrder = new Order(order);
        insertOrder.save(function(err, savedOrder, numAffected) {
            if (err) {
                res.status(500).json({ message: err });
            } else {
                res.status(200).json({ out_trade_no: out_trade_no, pay_url: result.code_url });
            }
        });
    });

});

router.use('/wxpay/notify', wxpay.useWXCallback(function(msg, req, res, next) {
    // msg: 微信回调发送的数据
    res.success();
    var payInfo = msg;
    if (payInfo.return_code != "SUCCESS" || payInfo.result_code != "SUCCESS") {
        return;
    }
    var out_trade_no = payInfo.out_trade_no;
    Order.find({ out_trade_no: payInfo.out_trade_no, transaction_id: { $exists: false } })
        .exec()
        .then(function(data) {
            if (data.length > 0) {
                var order = data[0];
                order.transaction_id = payInfo.transaction_id;
                order.order_date = new Date();
                order.save();
                return order;
            }
        })
        .then(function(order) {
            var addMonth = order.package == "12个月" ? 12 : 3;
            var usernames = order.student_usernames.split(";");
            for (var i = 0; i < usernames.length; i++) {
                var username = usernames[i];
                User.find({ username: username })
                    .populate('teacher')
                    .exec()
                    .then(function(users) {
                        if (users.length > 0) {
                            var user = users[0];
                            var expired_at = user.expired_at;
                            let expiration = null;
                            if (expired_at) {
                                expiration = new Date(expired_at);
                                expiration.setMonth(expiration.getMonth() + addMonth);
                            } else {
                                let d = new Date();
                                d.setMonth(d.getMonth() + addMonth)
                                expiration = d;
                            }
                            user.expired_at = expiration;
                            user.save();
                            logger.info(user.teacher.name + "用微信支付了订单：" + order.out_trade_no);
                        }
                    }, function(err) {
                        logger.error("更新学员有效期失败：" + err);
                    })
            }
        })
}));


router.get('/query/:out_trade_no', jwt({ secret: secretCallback }), function(req, res) {
    var out_trade_no = req.params.out_trade_no;
    Order.find({ out_trade_no: out_trade_no, transaction_id: { $exists: true } })
        .exec()
        .then(function(orders) {
                res.json(orders);
            },
            function(err) {
                logger.error("查询订单失败。" + err);
                res.status(500).json({ message: err });
            }
        )
})

router.delete('/:out_trade_no', jwt({ secret: secretCallback }), function(req, res, next) {
    var out_trade_no = req.params.out_trade_no;
    closeOrder(out_trade_no);
});

// router.post('/', jwt({ secret: secretCallback }), function(req, res) {
//     var updated_order = req.body;
//     Order.find({ out_trade_no: updated_order.out_trade_no })
//         .exec()
//         .then(function(data) {
//                 var setting;
//                 if (data.length === 0) { // db is empty, create the first one
//                     res.status(500).json({ message: "该订单尚未完成支付" });
//                 } else { // update existing one
//                     order = data[0];
//                     order.user = req.user.iss;
//                     order.payer_name = req.user.name;
//                     order.transaction_id = "1234567890123";
//                     order.order_date = new Date();
//                     order.total_fee = updated_order.total_fee;
//                     order.package = updated_order.package;
//                     order.student_usernames = updated_order.student_usernames;
//                     order.student_names = updated_order.student_names;
//                     order.save(function(err, savedOrder, numAffected) {
//                         if (err) {
//                             res.status(500).json({ message: err });
//                         } else {
//                             res.status(200).json({ message: "订单信息已成功保存" });
//                         }
//                     });
//                 }
//             },
//             function(err) {
//                 res.status(500).json({ message: err });
//             }
//         )
// });

//临时接口
// router.get('/clear', function(req, res, next) {
//     Order.find()
//         .remove()
//         .exec()
//         .then(function(orders) {
//                 res.json(orders);
//             },
//             function(err) {
//                 res.status(500).end();
//             }
//         )
// });


router.post('/search', jwt({ secret: secretCallback }), function(req, res, next) {
    var param = req.body;
    var first = param.first;
    var rows = param.rows;
    var search = param.search;
    var from_date = param.from_date;
    var to_date = param.to_date;
    if(from_date == undefined){
        from_date = new Date(0);
    }else{
        from_date = new Date(from_date);
    }
    if(to_date == undefined){
        to_date = new Date(86400000000000);//big enough
    }else{
        let to_date_tmp = new Date(to_date);
        to_date_tmp.setDate(to_date_tmp.getDate()+1);
        to_date = to_date_tmp;
    }

    var conditions = {};
    if (search) {
        conditions = {
            $or: [
                { out_trade_no: { $regex: search } },
                { transaction_id: { $regex: search } },
                { student_list: { $regex: search } },
                // { student_usernames: { $regex: search } },
                // { student_names: { $regex: search } },
                { payer_name: { $regex: search } },
            ]
        };
    }
    conditions.order_date = {$gte:from_date,$lt:to_date},
    conditions.transaction_id = { $exists: true };

    if (req.user.role === "老师") { // 老师只能查看自己的支付记录
        conditions.user = req.user.iss;
    }

    var query1 = Order.find(conditions)
        .sort({ order_date: -1 })
        .skip(first)
        .limit(rows)
        .exec();
    var query2 = Order.aggregate([
                        { $match : conditions},
                        { $group: { _id: null, count: { $sum: 1 } } }
                       ]).exec();
    var query3 = Order.aggregate([
                        { $match : conditions},
                        { $group: { _id: null, total_fee: { $sum: "$total_fee" } } }
                       ]).exec();
    var query4 = Order.aggregate([
                        { $match : conditions},
                        { $group: { _id: null, total_commission: { $sum: "$total_commission" } } }
                       ]);
    Promise.all([query1,query2,query3,query4])
    .then(function([orders,count,total_fee,total_commission]){
        var json;
        if(count.length>0){
            json = {
                totalCount: count[0].count,
                orders: orders,
                total_fee:total_fee[0].total_fee,
                total_commission:total_commission[0].total_commission};
        }else{
            json = {
                totalCount: 0,
                orders: orders,
                total_fee:0,
                total_commission:0
            };
        }
        res.status(200).json(json)
    },function(err){
            res.status(500).send(err);
        });
    });



function generateOutTradeNo() {
    var now = new Date();
    var prefix = (now.toISOString().replace(/[-T:Z\.]/g, '').substr(0, 16)).toString();
    var total = 1;
    for (let i = 0; i < 4; i++) {
        total *= 10;
    }
    var base = total - total / 10;
    var fill = total - base - 1;

    var random = base + Math.floor(Math.random() * fill);
    return prefix + random;
}

function closeOrder(out_trade_no) {
    Order.find({ out_trade_no: out_trade_no, transaction_id: { $exists: false } })
        .exec()
        .then(function(data) {
            if (data.length > 0) {
                wxpay.closeOrder({ out_trade_no: out_trade_no });
                Order.remove({ out_trade_no: out_trade_no, transaction_id: { $exists: false } });
            }
        })
}



module.exports = router;