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
    var root = { label: '练习题库', items: [] };
    Directory.find({ parent: { $exists: false } })
        .exec()
        .then(function(directories) {
                var promises = [];
                directories.forEach(function(directory) {
                    promises.push(getNode(directory));
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
                            items = items.sort(keysrt('label', false));
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

function getNode(directory) {

    var defer = Q.defer();
    var node = {};
    node.label = directory.name;
    if (directory.level == 3) {
        node.id = directory._id;
    }

    getChildren(directory)
        .then(function(data) {
            if (data && data.length > 0) {
                node.items = data;
            }
            defer.resolve(node);
        }, function(err) {
            defer.reject(err);
        })
    return defer.promise;
}

function keysrt(key, desc) {

    return function(a, b) {

        return desc ? ~~(a[key] < b[key]) : ~~(a[key] > b[key]);

    }
}

module.exports = router;