var express = require('express');
var db = require('../utils/database.js').connection;
var router = express.Router();
var Q = require('q');
var jwt = require('express-jwt');
var config = require('../common.js').config();
var logger = require('../utils/logger.js');
var secretCallback = require('../utils/secretCallback.js').secretCallback;
var Order = require('../models/order')(db);
var WXPay = require('node-wxpay');
var fs = require("fs");

var wxpay = WXPay({
    appid: config.wxpay.app_id,
    mch_id: config.wxpay.mch_id,
    partner_key: config.partner_key,
    // pfx: fs.readFileSync('../apiclient_cert.p12')
});

router.post('/prepare', jwt({ secret: secretCallback }), function(req, res) {
    var tradeNo = generateOutTradeNo();
    wxpay.createUnifiedOrder({
        body: '扫码支付测试',
        out_trade_no: tradeNo,
        total_fee: 1,
        spbill_create_ip: '60.205.216.128',
        notify_url: 'http://cg.dplink.com.cn/api/orders/wxpay/notify',
        trade_type: 'NATIVE',
        product_id: '1234567890'
    }, function(err, result) {
        console.log(result);
        wxpay.closeOrder({ out_trade_no: tradeNo }, function(err, result) {
            console.log("=============close order===========");
            console.log(result);
        });
    });
    res.status(200).json({ tradeNo: tradeNo });
});

router.get('/wxpay/notify1/:tradeNo', function(req, res) {
    var tradeNo = req.params.tradeNo;
    // create the order in db
    Order.find({ out_trade_no: tradeNo })
        .exec()
        .then(function(orders) {
                if (orders.length > 0) {
                    res.status(200).send("您的订单：" + tradeNo + "已成功支付。");
                } else {
                    var order = new Order();
                    order.out_trade_no = tradeNo;
                    order.save(function(err, savedOrder, numAffected) {
                        if (err) {
                            console.log(err);
                            res.status(500).json({ message: err });
                        } else {
                            res.status(200).send("您的订单：" + tradeNo + "已成功支付。");
                        }
                    });
                }
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )

})

router.get('/query/:tradeNo', jwt({ secret: secretCallback }), function(req, res) {
    var tradeNo = req.params.tradeNo;
    Order.find({ out_trade_no: tradeNo })
        .exec()
        .then(function(orders) {
                res.json(orders);
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
})

router.post('/', jwt({ secret: secretCallback }), function(req, res) {
    var updated_order = req.body;
    Order.find({ out_trade_no: updated_order.out_trade_no })
        .exec()
        .then(function(data) {
                var setting;
                if (data.length === 0) { // db is empty, create the first one
                    res.status(500).json({ message: "该订单尚未完成支付" });
                } else { // update existing one
                    order = data[0];
                    order.user = req.user.iss;
                    order.payer_name = req.user.name;
                    order.transaction_id = "1234567890123";
                    order.order_date = new Date();
                    order.total_fee = updated_order.total_fee;
                    order.package = updated_order.package;
                    order.student_usernames = updated_order.student_usernames;
                    order.student_names = updated_order.student_names;
                    order.save(function(err, savedOrder, numAffected) {
                        if (err) {
                            res.status(500).json({ message: err });
                        } else {
                            res.status(200).json({ message: "订单信息已成功保存" });
                        }
                    });
                }
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

//临时接口
router.get('/clear', function(req, res, next) {
    Order.find()
        .remove()
        .exec()
        .then(function(orders) {
                res.json(orders);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

//临时接口
router.get('/', function(req, res, next) {
    var query = {};
    Order.find(query)
        .exec()
        .then(function(orders) {
                res.json(orders);
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

router.post('/search', jwt({ secret: secretCallback }), function(req, res, next) {
    var param = req.body;
    var first = param.first;
    var rows = param.rows;
    var search = param.search;
    var conditions = {};
    if (search) {
        conditions = {
            $or: [
                { out_trade_no: { $regex: search } },
                { transaction_id: { $regex: search } },
                { student_usernames: { $regex: search } },
                { student_names: { $regex: search } },
                { payer_name: { $regex: search } },
            ]
        };
    }
    if (req.user.role === "老师") { // 老师只能查看自己的支付记录
        conditions.user = req.user.iss;
    }

    Order.find(conditions)
        .sort({ order_date: -1 })
        .skip(first)
        .limit(rows)
        .exec()
        .then(function(orders) {
                Order.count(conditions, function(err, c) {
                    if (err) {
                        logger.error(err);
                        res.status(500).json({ message: "获取订单总数失败" });
                    }
                    res.status(200).json({
                        totalCount: c,
                        orders: orders
                    })
                });
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
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



module.exports = router;