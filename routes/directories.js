var express = require('express');
var db = require('../utils/database.js').connection;
var Directory = require('../models/directory.js')(db);
var router = express.Router();
var Q = require('q');
var secretCallback = require('../utils/secretCallback.js').secretCallback;
var Exam = require('../models/exam.js')(db);
var jwt = require('express-jwt');

router.post('/', function(req, res) {
    var directory = new Directory(req.body);
    directory.save(function(err, savedDirectory, numAffected) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).json({ id: savedDirectory._id });
        }
    });
});

router.get('/', function(req, res, next) {
    Directory.find()
        .exec()
        .then(function(directories) {
                res.json(directories);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

router.get('/tree', jwt({ secret: secretCallback }), function(req, res, next) {
    var passed_directories = [];
    //first get list of passed directories
    Exam.find({ user: req.user.iss, status: "达标" }, { directory: 1, _id: 0 })
        .exec()
        .then(function(exams) {
            for (var i = 0; i < exams.length; i++) {
                passed_directories.push(exams[i].directory);
            }
            console.log(passed_directories);
            var root = { label: '练习题库', items: [] };
            Directory.find({ parent: { $exists: false } })
                .exec()
                .then(function(directories) {
                        var promises = [];
                        directories.forEach(function(directory) {
                            promises.push(getNode(directory, passed_directories));
                        });
                        Q.all(promises)
                            .then(function(items) {
                                root.items = items;
                                res.status(200).json(items);
                            }, function(err) {
                                res.status(500).send(err);
                            })

                    },
                    function(err) {
                        res.status(500).send(err);
                    }
                )
        })



});

function getChildren(parent, passed_directories) {
    var defer = Q.defer();
    var deepPopulate = '';
    if (parent.level === 2) {
        deepPopulate = 'parent.parent'
    }
    Directory.find({ parent: parent._id })
        .deepPopulate(deepPopulate)
        .exec()
        .then(function(directories) {
                if (directories.length == 0) {
                    defer.resolve(null);
                } else {
                    var promises = [];
                    directories.forEach(function(directory) {
                        promises.push(getNode(directory, passed_directories));
                    });
                    Q.all(promises)
                        .then(function(items) {
                            items = items.sort((a, b) => {
                                if (a.label > b.label) {
                                    return 1;
                                } else if (a.label < b.label) {
                                    return -1;
                                } else {
                                    return 0;
                                }
                            })
                            defer.resolve(items);
                        }, function(err) {
                            defer.reject(err);
                        })
                }

            },
            function(err) {
                defer.reject(err);
            }
        )
    return defer.promise;
}

function getNode(directory, passed_directories) {
    var defer = Q.defer();
    var node = {};
    node.label = directory.name;
    if (directory.level == 3) {
        if (passed_directories.indexOf(directory._id) >= 0) {
            node.label = directory.name + "(已达标)";
        }
        node._id = directory._id;
        node.exam_pass_score = directory.exam_pass_score ? directory.exam_pass_score : 360;
        node.path = directory.parent.parent.name + "/" + directory.parent.name + "/" + directory.name;
        defer.resolve(node);
    } else {
        getChildren(directory, passed_directories)
            .then(function(data) {
                if (data && data.length > 0) {
                    node.items = data;
                }
                defer.resolve(node);
            }, function(err) {
                defer.reject(err);
            })
    }


    return defer.promise;
}

module.exports = router;