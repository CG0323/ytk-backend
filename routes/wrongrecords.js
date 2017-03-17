var express = require('express');
var db = require('../utils/database.js').connection;
var WrongRecord = require('../models/wrongrecord')(db);
var router = express.Router();
var Q = require('q');
var logger = require('../utils/logger.js');
var config = require('../common.js').config();
var jwt = require('express-jwt');
var secretCallback = require('../utils/secretCallback.js').secretCallback;

router.post('/', jwt({ secret: secretCallback }), function(req, res) {
    var user = req.user;
    var data = req.body;
    var correct = data.correct;
    if (correct) { // remove from database if exist
        WrongRecord.remove({ user: user.iss, problem: data.problem })
            .exec()
            .then(function(data) {
                    logger.info(user.name + "删除了错题记录");
                    res.json({ message: "错题记录已成功删除" });
                },
                function(err) {
                    res.status(500).json({ error: err, message: "错题记录删除失败" });
                }
            )
    } else { // add to database if not exist
        WrongRecord.find({ user: user.iss, problem: data.problem })
            .exec()
            .then(function(records) {
                if (records.length > 0) { //aready exist
                    res.status(200).json({ message: "一错再错..." })
                } else {
                    var wrongRecord = new WrongRecord(data);
                    wrongRecord.user = user.iss;
                    wrongRecord.save(function(err, savedRecord, numAffected) {
                        if (err) {
                            res.status(500).send(err);
                        } else {
                            logger.info(user.name + "添加了错题记录");
                            res.status(200).json({ _id: savedRecord._id });
                        }
                    });
                }
            })
    }
});

router.get('/', jwt({ secret: secretCallback }), function(req, res, next) {
    var user = req.user;
    WrongRecord.find({ user: user.iss })
        .exec()
        .then(function(records) {
                var problems = records.map(rec => rec.problem);
                res.json(problems);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

router.get('/withcontent', jwt({ secret: secretCallback }), function(req, res, next) {
    var user = req.user;
    WrongRecord.find({ user: user.iss })
        .deepPopulate('problem.parent.parent.parent')
        .exec()
        .then(function(records) {
                var problems = records.map(rec => {
                    let item = rec.problem;
                    var problem = {};
                    problem._id = item._id;
                    problem.name = item.name;
                    problem.sgf = item.sgf;
                    problem.path = item.parent.parent.parent.name + "/" + item.parent.parent.name + "/" + item.parent.name + "/" + item.name;
                    return problem;
                });
                res.json(problems);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

router.get('/user/:userId', jwt({ secret: secretCallback }), function(req, res, next) {
    var userId = req.params.userId;
    WrongRecord.find({ user: userId })
        .populate('problem')
        .exec()
        .then(function(records) {
                res.json(records);
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

//临时接口
router.get('/clear', function(req, res, next) {
    WrongRecord.find()
        .remove()
        .exec()
        .then(function(result) {
                res.json(result);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

module.exports = router;