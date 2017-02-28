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

export function getDefaultSettings() {
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