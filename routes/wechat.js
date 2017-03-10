var express = require('express');
var router = express.Router();
var wechat = require('wechat');
var WechatAPI = require('wechat-api');
var OAuth = require('wechat-oauth');
var db = require('../utils/database.js').connection;
var logger = require('../utils/logger.js');
var config = require('../common.js').config();
var menu = JSON.stringify(require('../data/menu.json'));


var client = new OAuth(config.wechat.app_id, config.wechat.app_secret);
var api = new WechatAPI(config.wechat.app_id, config.wechat.app_secret);

// api.createMenu(menu, function(err, result) {
//     if (err) {
//         console.log(err);
//     }
// });

router.get('/', wechat(config.wechat.token, function(req, res, next) {
    res.writeHead(200);
    res.end('hello from node api');
}));

router.post('/', wechat(config.wechat.token, wechat.text(function(message, req, res, next) {
    var openId = message.FromUserName;
    var text = message.Content;
    if (text == '我叫什么') {
        api.getUser(openId, function(err, data) {
            if (err) {

            } else {
                var nickname = data.nickname;
                res.reply("你叫" + nickname + "嘛。");
            }
        });
    } else if (text == '我是谁') {
        api.getUser(openId, function(err, data) {
            if (err) {

            } else {
                var remark = data.remark;
                res.reply("你是" + remark + "。");
            }
        });
    }
})));

module.exports = router;