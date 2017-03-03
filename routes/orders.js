var express = require('express');
var db = require('../utils/database.js').connection;
var router = express.Router();
var Q = require('q');
var jwt = require('express-jwt');
var config = require('../common.js').config();
var logger = require('../utils/logger.js');
var secretCallback = require('../utils/secretCallback.js').secretCallback;

router.post('/prepare', jwt({ secret: secretCallback }), function(req, res) {
    var tradeNo = generateOutTradeNo();
    res.status(200).json({ tradeNo: tradeNo });
});

router.get('/wxpay/notify1/:total', function(req, res) {
    var total = req.params.total;
    res.status(200).send("您的" + total + "元已成功支付。");
})



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