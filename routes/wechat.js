var express = require('express');
var router = express.Router();
var wechat = require('wechat');
var WechatAPI = require('wechat-api');
var appConfig = require('../common.js').config();
var OAuth = require('wechat-oauth');
var db = require('../utils/database.js').connection;
var logger = require('../utils/logger.js');
var config = require('../common.js').config();


var client = new OAuth(appConfig.app_id, appConfig.app_secret);
var api = new WechatAPI(appConfig.app_id, appConfig.app_secret);

router.get('/', wechat(config.wechat.token, function(req, res, next) {
    res.writeHead(200);
    res.end('hello from node api');
}));

module.exports = router;