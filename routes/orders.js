var express = require('express');
var db = require('../utils/database.js').connection;
var router = express.Router();
var Q = require('q');
var jwt = require('express-jwt');
var config = require('../common.js').config();
var logger = require('../utils/logger.js');
// var ordernumber = require('../utils/ordernumber.js');

router.post('/prepare', jwt({ secret: config.token_secret }), function(req, res) {
    var orderNo = generateOrderNo();
    res.status(200).json({ orderNo: orderNo });
});


function generateOrderNo() {
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