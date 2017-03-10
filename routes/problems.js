var express = require('express');
var db = require('../utils/database.js').connection;
var Problem = require('../models/problem')(db);
var router = express.Router();
var Q = require('q');
var jwt = require('express-jwt');
var secretCallback = require('../utils/secretCallback.js').secretCallback;

router.post('/', jwt({ secret: secretCallback }),function(req, res) {
    console.log("post problem");
    var problem = new Problem(req.body);
    problem.save(function(err, savedProblem, numAffected) {
        if (err) {
            //console.log(err);
            res.status(500).send(err);
        } else {
            res.status(200).json({ name: savedProblem.name });
        }
    });
});

router.get('/', jwt({ secret: secretCallback }), function(req, res, next) {
    Problem.find()
        .exec()
        .then(function(problems) {
                res.json(problems);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

router.get('/directories/:id', jwt({ secret: secretCallback }), function(req, res, next) {
    Problem.find({ parent: req.params.id })
        .deepPopulate('parent.parent.parent')
        .exec()
        .then(function(problems) {
                problems = problems.sort((a, b) => {
                    if (a.name > b.name) {
                        return 1;
                    } else if (a.name < b.name) {
                        return -1;
                    } else {
                        return 0;
                    }
                });
                var retValue = problems.map(item => {
                    var problem = {};
                    problem._id = item._id;
                    problem.name = item.name;
                    problem.sgf = item.sgf;
                    problem.path = item.parent.parent.parent.name + "/" + item.parent.parent.name + "/" + item.parent.name + "/" + item.name;
                    return problem;
                })
                res.json(retValue);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

router.delete('/:id', jwt({ secret: secretCallback }), function(req, res) {
    Problem.remove({ _id: req.params.id }, function(err, problem) {
        if (err) {
            logger.error(err);
            res.status(500).json({ message: err });
        }
        res.json({ message: '题目已成功删除' });
    });
});


module.exports = router;