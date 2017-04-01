var express = require('express');
var db = require('../utils/database.js').connection;
var Problem = require('../models/problem')(db);
var Directory = require('../models/directory.js')(db);
var router = express.Router();
var Q = require('q');
var jwt = require('express-jwt');
var secretCallback = require('../utils/secretCallback.js').secretCallback;

function addProblem(res,data){
    var problem = new Problem({name:data.name,sgf:data.sgf,parent:data.parent,owner:data.owner});
    problem.save(function(err, savedProblem, numAffected) {
        if (err) {
            //console.log(err);
            res.status(500).send(err);
        } else {
            res.status(200).json({ name: savedProblem.name });
        }
    });
}
router.post('/', jwt({ secret: secretCallback }),function(req, res) {
    var data = req.body;
    var needCheck = false;
    data.owner = req.user.iss;
    if(req.user.role != "管理员"){
        needCheck = true;
        Directory.findById(data.parent,function(err, directory) {
                if(directory){
                    if(directory.owner === undefined || directory.owner !=req.user.iss){
                        res.status(400).json({message:'没有权限上传该目录'})
                    }else{
                        addProblem(res,data);
                    }
                }else{
                    res.status(400).json({message:'没有找到上传目录'})
                }
            });
    }
    if(needCheck == false){
        addProblem(res,data);
    }
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

function deleteProblem(res,id){
    Problem.remove({ _id: id }, function(err, problem) {
        if (err) {
            logger.error(err);
            res.status(500).json({ message: err });
        }
        res.json({ message: '题目已成功删除' });
    });
}
router.delete('/:id', jwt({ secret: secretCallback }), function(req, res) {
    var needCheck = false;
    if(req.user.role != "管理员"){
        needCheck = true;
        Problem.findById(req.params.id,function(err, problem) {
                if(problem){
                    if(problem.owner === undefined || problem.owner !=req.user.iss){
                        res.status(400).json({message:'没有权限删除该题目'})
                    }else{
                        deleteProblem(res,req.params.id);
                    }
                }else{
                    res.status(400).json({message:'没有找到对应题目'})
                }
            });
    }
    if(needCheck == false){
        deleteProblem(res,req.params.id );
    }

});


module.exports = router;