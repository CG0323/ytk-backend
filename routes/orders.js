var express = require('express');
var db = require('../utils/database.js').connection;
var router = express.Router();
var Q = require('q');
var jwt = require('express-jwt');
var config = require('../common.js').config();
var logger = require('../utils/logger.js');
var ordernumber = require('../utils/ordernumber.js');

router.post('/prepare', jwt({ secret: config.token_secret }), function(req, res) {
    var orderNo = ordernumber.generate();
    res.status(200).json({ orderNo: orderNo });
});



module.exports = router;