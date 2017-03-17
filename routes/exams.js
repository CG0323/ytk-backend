var express = require('express');
var db = require('../utils/database.js').connection;
var Exam = require('../models/exam')(db);
var router = express.Router();
var Q = require('q');
var config = require('../common.js').config();
var logger = require('../utils/logger.js');
var jwt = require('express-jwt');
var secretCallback = require('../utils/secretCallback.js').secretCallback;

router.post('/', jwt({ secret: secretCallback }), function(req, res) {
    var user = req.user;
    var data = req.body;
    var exam = new Exam(data);
    exam.user = req.user.iss;
    exam.save(function(err, savedExam, numAffected) {
        if (err) {
            res.status(500).json({ error: err, message: "测验结果保存失败" });
        } else {
            logger.info(user.name + "完成了一次测验");
            res.status(200).json({ message: "测验结果已保存" });
        }
    });
});

// router.get('/', jwt({ secret: secretCallback }), function(req, res, next) {
// var user = req.user;
// Exam.find({ user: user.iss })
router.get('/', function(req, res, next) {
    Exam.find({})
        .exec()
        .then(function(exams) {
                res.json(exams);
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

//临时接口
router.get('/clear', function(req, res, next) {
    Exam.find()
        .remove()
        .exec()
        .then(function(exams) {
                res.json(exams);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

router.get('/directory/:id', jwt({ secret: secretCallback }), function(req, res, next) {
    var directoryId = req.params.id;
    Exam.find({ directory: directoryId })
        .exec()
        .then(function(exams) {
                logger.info(req.user.name + "查看了排行榜");
                res.json(exams);
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

router.post('/search', jwt({ secret: secretCallback }), function(req, res, next) {
    var param = req.body;
    var first = param.first;
    var rows = param.rows;
    var directoryId = param.directory;
    var conditions = { directory: directoryId };

    Exam.find(conditions)
        .sort({ total_score: -1 })
        .skip(first)
        .limit(rows)
        .populate({ path: 'user', select: { _id: 1, name: 1, username: 1 } })
        .exec()
        .then(function(exams) {
                Exam.count(conditions, function(err, c) {
                    if (err) {
                        logger.error(err);
                        res.status(500).json({ message: "获取测验结果总数失败" });
                    }
                    res.status(200).json({
                        total_count: c,
                        exams: exams
                    })
                });
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

router.post('/search-self', jwt({ secret: secretCallback }), function(req, res, next) {
    var userId = req.user.iss;
    var param = req.body;
    var first = param.first;
    var rows = param.rows;
    var conditions = { user: userId };
    Exam.find(conditions)
        .sort({ exam_date: -1 })
        .skip(first)
        .limit(rows)
        .deepPopulate('directory.parent.parent')
        .exec()
        .then(function(exams) {
                Exam.count(conditions, function(err, c) {
                    if (err) {
                        logger.error(err);
                        res.status(500).json({ message: "获取测验结果总数失败" });
                    }
                    res.status(200).json({
                        totalCount: c,
                        exams: exams
                    })
                });
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

module.exports = router;