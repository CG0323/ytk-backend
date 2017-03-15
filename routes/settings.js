var express = require('express');
var db = require('../utils/database.js').connection;
var router = express.Router();
var Q = require('q');
var jwt = require('express-jwt');
var config = require('../common.js').config();
var logger = require('../utils/logger.js');
var secretCallback = require('../utils/secretCallback.js').secretCallback;
var Settings = require('../models/settings')(db);
var Exam = require('../models/exam')(db);

router.get('/', function(req, res, next) {
    Settings.find()
        .exec()
        .then(function(data) {
                if (data.length === 0) {
                    res.json(getDefaultSettings());
                } else {
                    res.json(data[0]);
                }

            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

router.post('/', jwt({ secret: secretCallback }), function(req, res) {
    var user = req.user;
    if (user.role != "管理员") {
        res.status(401).json({ message: "无权限修改系统配置" });
    }

    var new_settings = req.body;
    Settings.find()
        .exec()
        .then(function(data) {
                var setting;
                if (data.length === 0) { // db is empty, create the first one
                    settings = new Settings(new_settings);
                } else { // update existing one
                    settings = data[0];
                    settings.price_3_months = new_settings.price_3_months;
                    settings.price_12_months = new_settings.price_12_months;
                    settings.trial_days = new_settings.trial_days;
                    settings.exam_duration = new_settings.exam_duration;
                    settings.default_pass_score = new_settings.default_pass_score;
                }

                settings.save(function(err, savedSettings, numAffected) {
                    if (err) {
                        res.status(500).json({ message: err });
                    } else {
                        logger.info(req.user.name + "修改了系统配置参数");
                        res.status(200).json({ message: "系统配置已成功保存" });
                    }
                });
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

function getDefaultSettings() {
    var settings = {};
    settings.price_3_months = 90;
    settings.price_12_months = 300;
    settings.commission_3_months = 10;
    settings.commission_12_months = 30;
    settings.trial_days = 15;
    settings.exam_duration = 3;
    settings.score_per_turn = 10;
    // settings.time_bonus_per_second = 5;
    settings.default_pass_score = 600;
    return settings;
}





module.exports = router;