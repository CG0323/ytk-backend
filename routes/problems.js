var express = require('express');
var db = require('../utils/database.js').connection;
var Problem = require('../models/problem')(db);
var router = express.Router();
var Q = require('q');

router.post('/', function(req, res) {
    var problem = new Problem(req.body);
    problem.save(function(err, savedProblem, numAffected) {
        if (err) {
            console.log(err);
            res.status(500).send(err);
        } else {
            res.status(200).json({ name: savedProblem.name });
        }
    });
});

router.get('/', function(req, res, next) {
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

router.get('/directories/:id', function(req, res, next) {
    Problem.find({ parent: req.params.id })
        .exec()
        .then(function(problems) {
                problems = problems.sort((a, b) => {
                    return ~~(a.name > b.name);
                });
                res.json(problems);
            },
            function(err) {
                res.status(500).end();
            }
        )
});


module.exports = router;