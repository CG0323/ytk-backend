var express = require('express');
var db = require('../utils/database.js').connection;
var Directory = require('../models/directory.js')(db);
var Problem = require('../models/problem.js')(db);
var User = require('../models/user.js')(db);
var jwt = require('express-jwt');
var router = express.Router();
var Q = require('q');
var secretCallback = require('../utils/secretCallback.js').secretCallback;
var Exam = require('../models/exam.js')(db);
var jwt = require('express-jwt');

function createDirectory(res,data){
    Directory.find({"$and":[{name:data.name},{parent:data.parent}]},function(err,directories){
        if(directories.length>0){
            res.status(400).json({message:'已存在同名目录'})
        }else{
            var directory = new Directory({parent:data.parent,name:data.name,level:data.level,owner:data.owner,online:data.online});
            directory.save(function(err, savedDirectory, numAffected) {
                if (err) {
                    res.status(500).send(err);
                } else {
                    res.status(200).json({ id: savedDirectory._id,owner:savedDirectory.owner });
                }
            });
        }
    })
}
router.post('/', jwt({ secret: secretCallback }),function(req, res) {
    var data = req.body;
    var needCheck = false;
    data.owner = req.user.iss;
    //console.log(req.user);
    //console.log(data);
    
    if(req.user.role != "管理员"){
        if(data.level!=1){
            needCheck = true;
            Directory.findById(data.parent,function(err, parent) {
                //console.log(parent);
                if(parent){
                    if(parent.owner === undefined || parent.owner !=req.user.iss){
                        res.status(400).json({message:'没有权限创建该目录'})
                    }else{
                        //console.log(data);
                        createDirectory(res,data);
                    }
                }else{
                    res.status(400).json({message:'错误的父目录'})
                }
            });
        }
    }
    if(needCheck == false){
        createDirectory(res,data);
    }
});

function renameDirectory(res,data){
    Directory.find({"$and":[{name:data.name},{parent:data.parent}]},function(err,directories){
        if(directories.length>0 && directories[0]._id != data.id){
            res.status(400).json({message:'已存在同名目录'})
        }else{
            Directory.findById(data.id, function(err, directory) {
                if (err)
                    res.send(err);
                if(directory){
                    //console.log("name:"+data.name);
                    directory.name = data.name;
                    directory.online = data.online;
                    //directory.level = data.level;
                    //directory.parent = data.parent;
                    directory.save(function(err) {
                        if (err) {
                            logger.error(err);
                            res.status(500).json({ message: err });
                        }
                        res.json({ message: '目录名已成功更新' });
                    });
                }else{
                    res.status(400).json({message:'没有找到该目录'})
                }
            });
        }
    });
}
router.put('/:id', jwt({ secret: secretCallback }),function(req, res) {
    var data = req.body;
    var needCheck = false;

    if(req.user.role != "管理员"){
        needCheck = true;
        Directory.findById(req.params.id,function(err, directory) {
                //console.log(directory);
                if(directory){
                    if(directory.owner === undefined || directory.owner !=req.user.iss){
                        res.status(400).json({message:'没有权限更改该目录'})
                    }else{
                        //console.log(data);
                        renameDirectory(res,data);
                    }
                }else{
                    res.status(400).json({message:'没有找到该目录'})
                }
            });
    }
    if(needCheck == false){
        renameDirectory(res,data);
    }
});

function deleteDirectory(res,id){
    DeleteNodeV(id)
    .then(function(data){
        res.json({ message: '目录以及所属的所有内容均已成功删除' });
    })
    .catch(function(data){
        res.status(500).json({ message: err });
    })
}
router.delete('/:id', jwt({ secret: secretCallback }), function(req, res) {
    //console.log("delete "+req.params.id);
    var needCheck = false;
    if(req.user.role != "管理员"){
        needCheck = true;
        Directory.findById(req.params.id,function(err, directory) {
                //console.log(directory);
                if(directory){
                    if(directory.owner === undefined || directory.owner !=req.user.iss){
                        res.status(400).json({message:'没有权限删除该目录'})
                    }else{
                        deleteDirectory(res,req.params.id);
                    }
                }else{
                    res.status(400).json({message:'没有找到该目录'})
                }
            });
    }
    if(needCheck == false){
        deleteDirectory(res,req.params.id);
    }
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


router.get('/tree', jwt({ secret: secretCallback }), function(req, res, next) {
    var passed_directories = [];
    //console.log("user.teacher");
    //console.log(req.user);
    //first get list of passed directories
    Exam.find({ user: req.user.iss, status: "达标" }, { directory: 1, _id: 0 })
        .exec()
        .then(function(exams) {
            //console.log(exams);
            for (var i = 0; i < exams.length; i++) {
                passed_directories.push(exams[i].directory.toString());
            }
            var root = { label: '练习题库', items: [] };
            User.findById(req.user.iss, function(err, user) {
                if (err) {
                    logger.error(err);
                    res.status(500).json({ message: err });
                }
                if(!user){
                    res.status(400).json({message:'未找到用户资料'});
                }else{
                    //console.log("user teacher:"+user.teacher);
                    req.teacher = user.teacher;
                    //先找出系统所有的管理员，方便后面判断是否目录是管理员所有
                    User.find({role:"管理员"}).exec().then(function(administrators){
                        //console.log(administrators);
                        req.administrators = administrators;
                        Directory.find({"$and":[{ parent: { $exists: false } },{level:1}]})
                        .exec()
                        .then(function(directories) {
                            var promises = [];
                            //console.log(directories);
                            directories.forEach(function(directory) {
                                promises.push(getNode(directory, passed_directories,req));
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
                        })
                    },function(err){
                        res.status(500).send(err);
                    })
                }
            });
        })
});

function getChildren(parent, passed_directories,req) {
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
                            promises.push(getNode(directory, passed_directories,req));
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

function getNode(directory, passed_directories,req) {
    var defer = Q.defer();
    var node = {};
    var display=false;

    if(req.user.role === "管理员" || req.user.role === "老师"){
        display = true;
    }else{
        if(directory.owner===undefined){
            //系统内置
            display = true;
        }else if(directory.online){
            //目录上线
            if(directory.owner.toString() == req.teacher.toString()){
                //自己老师的目录
                display = true;
            }else{
                req.administrators.forEach(function(administrator){
                    if(directory.owner.toString() === administrator._id.toString()){
                        //管理员的目录，所有人可见
                        display = true;
                    }
                })
            }
        }
    }
    //console.log(directory.name+ "displayed:"+display);
    if(display){
        //console.log("111");
        node.label = directory.name;
        if (directory.level == 3) {
            if (passed_directories.indexOf(directory._id.toString()) >= 0) {
                node.label = directory.name + " (已达标)";
            }
            node._id = directory._id;
            node.exam_pass_score = directory.exam_pass_score;
            node.path = directory.parent.parent.name + "/" + directory.parent.name + "/" + directory.name;
            node.owner = directory.owner;
            defer.resolve(node);
        } else {
            getChildren(directory, passed_directories,req)
                .then(function(data) {
                    if (data && data.length > 0) {
                        //console.log(data);
                        node.items = data;
                    }
                    defer.resolve(node);
                }, function(err) {
                    defer.reject(err);
                })
        }
    }else{
        //不可见
        //console.log("222");
        defer.resolve({});
    }
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
    //console.log(directory.owner);
    node.owner = directory.owner;
    node.online = directory.online;

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
    //console.log("DeleteNodeV "+node_id);
    Directory.findById(node_id,function(err,directory){
        if (err){
            //console.log(err);
            defer.reject(err);
            return;
        }else if(!directory){
            //console.log("dir null");
            defer.resolve(null);
            return;
        }else{
            //console.log("getChildrenV "+directory);
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