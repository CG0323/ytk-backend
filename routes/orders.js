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

var tenpay = require('tenpay');

var tenConfig = {
    appid: config.wxpay.app_id,
    mchid: config.wxpay.mch_id,
    partnerKey: config.wxpay.partner_key,
    // pfx: require('fs').readFileSync('证书文件路径'),
    // notify_url: '支付回调网址',
    spbill_create_ip: '60.205.216.128'
}
var api = new tenpay(tenConfig);

router.post('/prepare', jwt({ secret: secretCallback }), function(req, res) {
    var order = req.body;
    if (order.out_trade_no) { // already crated wx order once, need to close it
        closeOrder(order);
    }
    var out_trade_no = generateOutTradeNo();
    var tenOrder = {
        out_trade_no: out_trade_no,
        body: '弈康通激活支付测试',
        total_fee: Math.floor(rder.total_fee * 100),
        trade_type: 'NATIVE',
        notify_url: config.wxpay.notify_url,
        product_id: order.package
    }
    api.unifiedOrder(tenOrder, function(err, result) {
        if (err) {
            res.status(500).json({ message: err });
        }
        order.out_trade_no = out_trade_no;
        order.user = req.user.iss;
        order.payer_name = req.user.name;
        var insertOrder = new Order(order);
        order.save(function(err, savedOrder, numAffected) {
            if (err) {
                console.log(err);
                res.status(500).json({ message: err });
            } else {
                res.status(200).json({ out_trade_no: out_trade_no, pay_url: result.code_url });
            }
        });
    });

});

var middleware = api.middlewareForExpress();
app.use('/wxpay/notify', middleware, function(req, res) {
    var payInfo = req.weixin;
    console.log(payInfo);
    var out_trade_no = payInfo.out_trade_no;
    Order.find({ out_trade_no: order.out_trade_no })
        .exec()
        .then(function(data) {
            if (data.length > 0) {
                data[0].transaction_id = payInfo.transaction_id;
                data[0].save();
            }
        })
})


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

router.get('/query/:out_trade_no', jwt({ secret: secretCallback }), function(req, res) {
    var out_trade_no = req.params.out_trade_no;
    Order.find({ out_trade_no: out_trade_no, transaction_id: { $exists: true } })
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

function closeOrder(order) {
    Order.find({ out_trade_no: order.out_trade_no, transaction_id: { $exists: false } })
        .exec()
        .then(function(data) {
            if (data.length > 0) {
                api.closeOrder({ out_trade_no: order.out_trade_no });
                Order.remove({ out_trade_no: order.out_trade_no, transaction_id: { $exists: false } });
            }
        })
}



module.exports = router;