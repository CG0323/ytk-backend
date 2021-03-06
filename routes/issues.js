var express = require('express');
var db = require('../utils/database.js').connection;
var Issue = require('../models/issue')(db);
var router = express.Router();
var Q = require('q');
var config = require('../common.js').config();
var logger = require('../utils/logger.js');
var jwt = require('express-jwt');
var secretCallback = require('../utils/secretCallback.js').secretCallback;

router.post('/', jwt({ secret: secretCallback }), function(req, res) {
    var user = req.user;
    var data = req.body;
    if (!data._id) { // create new
        var issue = new Issue(data);
        issue.submitter = user.iss;
        issue.save(function(err, savedIssue, numAffected) {
            if (err) {
                res.status(500).json({ message: err });
            } else {
                logger.info(user.name + "提交了一条错误汇报");
                res.status(200).json({ message: "报错已成功保存" });
            }
        });
    } else { // update
        Issue.findById(data._id, function(err, issue) {
            if (err) {
                logger.error(err);
                res.status(500).json({ message: err });
            }
            issue.problem_path = data.problem_path;
            issue.description = data.description;
            issue.status = data.status;
            issue.type = data.type;
            issue.comments = data.comments;
            issue.save(function(err, savedIssue, numAffected) {
                if (err) {
                    res.status(500).json({ message: err });
                } else {
                    logger.info(user.name + "更新了一条错误汇报");
                    res.status(200).json({ message: "报错已成功更新" });
                }
            });
        })
    }
});


router.post('/search', jwt({ secret: secretCallback }), function(req, res, next) {
    var param = req.body;
    var first = param.first;
    var rows = param.rows;
    var search = param.search;
    var status = param.status;
    var type = param.type;
    var conditions = {};
    if (search) {
        conditions = {
            $or: [
                { problem_path: { $regex: search } },
                { submitter_name: { $regex: search } },
                { description: { $regex: search } }
            ]
        };
    }
    if (status) {
        conditions.status = status;
    }
    if (type) {
        conditions.type = type;
    }
    // if (req.user.role === "老师") { // 老师只能查看自己的题库反馈
    //     conditions.directory_owner = req.user.iss;
    // }

    Issue.find(conditions)
        .sort({ created_at: -1 })
        .skip(first)
        .limit(rows)
        .exec()
        .then(function(issues) {
                Issue.count(conditions, function(err, c) {
                    if (err) {
                        logger.error(err);
                        res.status(500).json({ message: "获取报错总数失败" });
                    }
                    res.status(200).json({
                        totalCount: c,
                        issues: issues
                    })
                });
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

router.delete('/:id', jwt({ secret: secretCallback }), function(req, res, next) {
    var id = req.params.id;
    Issue.remove({ _id: id })
        .exec()
        .then(function(data) {
                logger.info(req.user.name + "删除了一条错误汇报");
                res.json({ message: "记录已成功删除" });
            },
            function(err) {
                res.status(500).json({ error: err, message: "记录删除失败" });
            }
        )
});

router.get('/', function(req, res, next) {
    // var user = req.user;
    Issue.find({})
        .exec()
        .then(function(issues) {
                res.json(issues);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

//临时接口
// router.get('/clear', function(req, res, next) {
//     Issue.find()
//         .remove()
//         .exec()
//         .then(function(info) {
//                 res.json(info);
//             },
//             function(err) {
//                 res.status(500).end();
//             }
//         )
// });



module.exports = router;