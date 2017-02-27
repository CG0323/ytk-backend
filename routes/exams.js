var express = require('express');
var db = require('../utils/database.js').connection;
var Exam = require('../models/exam')(db);
var router = express.Router();
var Q = require('q');
var config = require('../common.js').config();
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
                retVal = exams.map(exam => {
                    exam.directory_path = exam.directory.parent.parent.name + "/" + exam.directory.parent.name + "/" + exam.directory.name;
                    return exam;
                })
                res.json(retVal);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

router.get('/directory/:id', jwt({ secret: secretCallback }), function(req, res, next) {
    var directoryId = req.params.id;
    Exam.find({ directory: directoryId })
        .deepPopulate('directory.parent.parent')
        .exec()
        .then(function(exams) {
                exams = exams.map(exam => {
                    exam.directory_path = exam.directory.parent.parent.name + "/" + exam.directory.parent.name + "/" + exam.directory.name;
                    return exam;
                })
                res.json(exams);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

module.exports = router;