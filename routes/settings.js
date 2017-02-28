var express = require('express');
var db = require('../utils/database.js').connection;
var router = express.Router();
var Q = require('q');
var jwt = require('express-jwt');
var config = require('../common.js').config();
var logger = require('../utils/logger.js');
var secretCallback = require('../utils/secretCallback.js').secretCallback;
var Settings = require('../models/settings')(db);

//initialize with default settings
// Settings.find()
//     .exec()
//     .then(function(data) {
//             console.log("I am in settings default initial");
//             if (data.length === 0) {
//                 var settings = new Settings();
//                 settings.price_3_months = 10;
//                 settings.price_12_months = 30;
//                 settings.trial_days = 15;
//                 settings.exam_duration = 3;
//                 settings.score_per_turn = 10;
//                 settings.time_bonus_per_second = 5;
//                 settings.default_pass_score = 600;
//                 settings.save();
//             }
//         },
//         function(err) {
//             logger.err("settings 初始化失败");
//         }
//     )


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
                    settings.score_per_turn = new_settings.score_per_turn;
                    settings.time_bonus_per_second = new_settings.time_bonus_per_second;
                    settings.default_pass_score = new_settings.default_pass_score;
                }
                settings.save(function(err, savedSettings, numAffected) {
                    if (err) {
                        res.status(500).json({ message: err });
                    } else {
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
    settings.price_3_months = 10;
    settings.price_12_months = 30;
    settings.trial_days = 15;
    settings.exam_duration = 3;
    settings.score_per_turn = 10;
    settings.time_bonus_per_second = 5;
    settings.default_pass_score = 600;
    return settings;
}




module.exports = router;