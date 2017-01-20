var express = require('express');
var db = require('../utils/database.js').connection;
var Directory = require('../models/directory.js')(db);
var router = express.Router();
var Q = require('q');

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

router.get('/tree', function(req, res, next) {
    var root = { name: '练习题库', children: [] };
    Directory.find({ parent: { $exists: false } })
        .exec()
        .then(function(directories) {
                var promises = [];
                directories.forEach(function(directory) {
                    promises.push(getNode(directory));
                });
                Q.all(promises)
                    .then(function(children) {
                        root.children = children;
                        res.status(200).json(root);
                    }, function(err) {
                        res.status(500).send(err);
                    })


            },
            function(err) {
                res.status(500).send(err);
            }
        )

});

function getChildren(parent) {
    var defer = Q.defer();
    Directory.find({ parent: parent._id })
        .exec()
        .then(function(directories) {
                if (directories.length == 0) {
                    defer.resolve(null);
                } else {
                    var promises = [];
                    directories.forEach(function(directory) {
                        promises.push(getNode(directory));
                    });
                    Q.all(promises)
                        .then(function(children) {
                            defer.resolve(children);
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

function getNode(directory) {

    var defer = Q.defer();
    var node = {};
    node.name = directory.name;
    node._id = directory._id;
    getChildren(directory)
        .then(function(data) {
            if (data && data.length > 0) {
                node.children = data;
            }
            defer.resolve(node);
        }, function(err) {
            defer.reject(err);
        })
    return defer.promise;
}

module.exports = router;