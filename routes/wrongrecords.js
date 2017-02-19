var express = require('express');
var db = require('../utils/database.js').connection;
var WrongRecord = require('../models/wrongrecord')(db);
var router = express.Router();
var Q = require('q');
var config = require('../common.js').config();
var jwt = require('express-jwt');

router.post('/', jwt({ secret: config.token_secret }), function(req, res) {
    var user = req.user;
    var data = req.body;
    var correct = data.correct;
    if (correct) { // remove from database if exist
        WrongRecord.remove({ user: user._id, problem: data.problem })
            .exec()
            .then(function(data) {
                    res.json({ message: "错题记录已成功删除" });
                },
                function(err) {
                    res.status(500).json({ error: err, message: "错题记录删除失败" });
                }
            )
    } else { // add to database if not exist
        WrongRecord.find({ user: user._id, problem: data.problem })
            .exec()
            .then(function(records) {
                if (records.length > 0) { //aready exist
                    res.status(200).json({ message: "一错再错..." })
                } else {
                    var wrongRecord = new WrongRecord(data);
                    wrongRecord.user = user._id;
                    wrongRecord.save(function(err, savedRecord, numAffected) {
                        if (err) {
                            res.status(500).send(err);
                        } else {
                            res.status(200).json({ _id: savedRecord._id });
                        }
                    });
                }
            })
    }
});

// 临时接口
router.get('/', function(req, res, next) {
    WrongRecord.find({})
        .populate('problem')
        .exec()
        .then(function(records) {
                res.json(records);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

router.get('/user/:userId', function(req, res, next) {
    var userId = req.params.userId;
    WrongRecord.find({ user: userId })
        .populate('problem')
        .exec()
        .then(function(records) {
                res.json(records);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

module.exports = router;