var express = require('express');
var db = require('../utils/database.js').connection;
var Directory = require('../models/directory.js')(db);
var Problem = require('../models/problem.js')(db);
var jwt = require('express-jwt');
var router = express.Router();
var Q = require('q');
var secretCallback = require('../utils/secretCallback.js').secretCallback;

router.post('/', jwt({ secret: secretCallback }),function(req, res) {
    var data = req.body;
    Directory.find({"$and":[{name:data.name},{parent:data.parent}]},function(err,directories){
        if(directories.length>0){
            res.status(400).json({message:'已存在同名目录'})
        }else{
            var directory = new Directory({parent:data.parent,name:data.name,level:data.level});
            directory.save(function(err, savedDirectory, numAffected) {
                if (err) {
                    res.status(500).send(err);
                } else {
                    res.status(200).json({ id: savedDirectory._id });
                }
            });
        }
    })
});

router.put('/:id', jwt({ secret: secretCallback }),function(req, res) {
    var data = req.body;
    Directory.find({"$and":[{name:data.name},{parent:data.parent}]},function(err,directories){
        if(directories.length>0){
            res.status(400).json({message:'已存在同名目录'})
        }else{
            Directory.findById(req.params.id, function(err, directory) {
            if (err)
                res.send(err);
            //console.log("name:"+req.body.name);
            directory.name = req.body.name;
            //directory.level = req.body.level;
            //directory.parent = req.body.parent;
            directory.save(function(err) {
                if (err) {
                    logger.error(err);
                    res.status(500).json({ message: err });
                }
                res.json({ message: '目录名已成功更新' });
                });
            });
        }
    });
});

router.delete('/:id', jwt({ secret: secretCallback }), function(req, res) {
    //console.log("start delete"+req.params.id);

    DeleteNodeV(req.params.id)
    .then(function(data){
        res.json({ message: '目录以及所属的所有内容均已成功删除' });
    })
    .catch(function(data){
        res.status(500).json({ message: err });
    })
})

router.get('/', jwt({ secret: secretCallback }),function(req, res, next) {
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

router.get('/tree', jwt({ secret: secretCallback }),function(req, res, next) {
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

router.get('/dir', jwt({ secret: secretCallback }),function(req, res, next) {
    var root = { label: '练习题库', children: [],level:0};
    Directory.find({ parent: { $exists: false } })
        .exec()
        .then(function(directories) {
                var promises = [];
                directories.forEach(function(directory) {
                    promises.push(getNodeV(directory));
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

function getNodeV(directory) {
    var defer = Q.defer();
    var node = {};
    node.label = directory.name;
    //if (directory.level == 3) {
        node.id = directory._id;
    node.level = directory.level;
    //}

    getChildrenV(directory)
        .then(function(data) {
            if (data && data.length > 0) {
                //console.log(data);
                node.children = data;
            }
            defer.resolve(node);
        }, function(err) {
            defer.reject(err);
        })
    return defer.promise;
}

function getChildrenV(parent) {
    var defer = Q.defer();
    Directory.find({ parent: parent._id })
        .exec()
        .then(function(directories) {
                if (directories.length == 0) {
                    defer.resolve(null);
                } else {
                    var promises = [];
                    directories.forEach(function(directory) {
                        promises.push(getNodeV(directory));
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

function DeleteAProblem(id){
    var d1 = Q.defer();
    Problem.remove({ parent: id},function(err,problems){
            if(err){
                //console.log(err);
                return d1.reject(null);
            }
            return d1.resolve(problems);
    })
    return d1.promise;
}

function DeleteADirectory(id){
    var d2 = Q.defer();      
    Directory.remove({_id:id},function(err, dir){
            if(err){
                //console.log(err);
                return d2.reject(null);
            }
            return d2.resolve(dir);
    });
    return d2.promise;
}

function DeleteNodeV(node_id){
    var defer = Q.defer();
    Directory.findById(node_id,function(err,directory){
        if (err){
            defer.reject(err);
            return;
        }else if(!directory){
            defer.resolve(null);
            return;
        }else{
            getChildrenV(directory)
            .then(function(data){
                var promises = [];
                if (data && data.length > 0) {
                    //console.log("has "+ data.length+"children");
                    //删除子目录
                    data.forEach(function(dir){
                        //console.log("delete children dir "+dir.id);
                        promises.push(DeleteNodeV(dir.id));
                    });
                }
                if(directory.level == 3){
                    //删除子文件
                    //console.log("delete files dir "+directory._id);
                    promises.push(DeleteAProblem(directory._id));
                }
                //console.log("delete self "+directory._id);
                promises.push(DeleteADirectory(directory._id));
                Q.all(promises)
                    .then(function(items) {
                        defer.resolve(items);
                    }, function(err) {
                        defer.reject(err);
                    }) 
            }, function(err) {
                defer.reject(err);
            })
        }
    })
    return defer.promise;
}


module.exports = router;