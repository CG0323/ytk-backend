var express = require('express');
var passport = require('passport');
var db = require('../utils/database.js').connection;
var User = require('../models/user.js')(db);
var router = express.Router();
var logger = require('../utils/logger.js');
var config = require('../common.js').config();
var jwt_generator = require('jsonwebtoken');
var jwt = require('express-jwt');
var moment = require('moment');

// 临时接口
router.get('/register-admin', function(req, res) {
    User.register(new User({ username: config.admin_username, name: '管理员', role: '管理员', expired_at: new Date("2030-12-31") }), config.admin_password, function(err, user) {
        if (err) {
            logger.error(err);
            res.status(500).send(err);
        } else {
            res.status(200).json({ status: '管理员注册成功' });
        }
    });
});

// 临时接口
router.get('/register-teacher', function(req, res) {
    User.register(new User({ username: config.teacher_username, name: '祝老师', role: '老师', init_password: config.teacher_password, expired_at: new Date("2030-12-31") }), config.teacher_password, function(err, user) {
        if (err) {
            logger.error(err);
            res.status(500).send(err);
        } else {
            res.status(200).json({ status: '老师注册成功' });
        }
    });
});

// 临时接口
router.get('/register-student', function(req, res) {
    User.register(new User({ username: config.student_username, name: 'cowboy', role: '学员', init_password: config.student_password }), config.student_password, function(err, user) {
        if (err) {
            logger.error(err);
            res.status(500).send(err);
        } else {
            res.status(200).json({ status: '学员注册成功' });
        }
    });
});

// 临时接口
router.get('/clear', function(req, res, next) {
    User.remove()
        .exec()
        .then(function(data) {
                res.json(data);
            },
            function(err) {
                res.status(500).end();
            }
        )
});


router.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            logger.error(err);
            return res.status(500).send(err);
        }
        if (!user) {
            return res.status(401).send("用户名或密码错误");
        }
        var secret = config.token_secret;
        var token = jwt_generator.sign({ _id: user._id, name: user.name, role: user.role }, secret, { expiresIn: '7d' });
        logger.info(user.name + " 登录系统。" + req.clientIP);
        res.status(200).json({ name: user.name, username: user.username, role: user.role, token: token });

    })(req, res, next);
});


// router.post('/', jwt({ secret: config.token_secret }), function(req, res) {
//     var data = req.body;
//     User.find({ username: data.username }, function(err, users) {
//         if (users.length > 0) {
//             res.status(400).send('系统中已存在该账号');
//         } else {
//             User.register(new User({ username: data.username, name: data.name, role: data.role }), data.password, function(err, user) {
//                 if (err) {
//                     logger.error(err);
//                     res.status(500).json({ message: err });
//                 } else {
//                     res.status(200).json({ message: '已成功创建账号' });
//                 }
//             });
//         }

//     })
// });

router.post('/teacher', jwt({ secret: config.token_secret }), function(req, res) {
    var user = req.user;
    if (user.role != "管理员") {
        res.status(401).json({ message: "无权限创建教师账号" });
    }
    var data = req.body;
    User.find({ username: data.username }, function(err, users) {
        if (users.length > 0) {
            res.status(400).json({ message: '用户名已被使用' });
        } else {
            var expired_at = new Date("2030-12-31");
            User.register(new User({ username: data.username, name: data.name, role: "老师", init_password: data.password, expired_at: expired_at }), data.password, function(err, user) {
                if (err) {
                    logger.error(err);
                    res.status(500).json({ message: err });
                } else {
                    logger.info(user.name + " 创建了教师账号：" + data.username);
                    res.status(200).json({ message: '已成功创建教师员账号' });
                }
            });
        }

    })
});

router.post('/student', jwt({ secret: config.token_secret }), function(req, res) {
    var user = req.user;
    if (user.role == "学员") {
        res.status(401).json({ message: "无权限创建学员账号" });
    }
    var data = req.body;
    User.find({ username: data.username }, function(err, users) {
        if (users.length > 0) {
            res.status(400).json({ message: '用户名已被使用' });
        } else {
            User.register(new User({ teacher: user._id, username: data.username, name: data.name, role: "学员", init_password: data.password }), data.password, function(err, savedUser) {
                if (err) {
                    logger.error(err);
                    res.status(500).send(err);
                } else {
                    logger.info(user.name + " 创建了学员账号：" + data.username);
                    res.status(200).json({ message: '已成功创建学员账号' });
                }
            });
        }

    })
});


router.delete('/:id', jwt({ secret: config.token_secret }), function(req, res) {
    User.remove({ _id: req.params.id }, function(err, user) {
        if (err) {
            logger.error(err);
            res.status(500).json({ message: err });
        }
        logger.info(req.user.name + " 删除了 " + req.params.id + " 的账号" + req.clientIP);
        res.json({ message: '账号已成功删除' });
    });
});

//debug only
router.get('/', function(req, res, next) {
    var query = {};
    User.find(query)
        .exec()
        .then(function(users) {
                res.json(users);
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

router.get('/teachers', jwt({ secret: config.token_secret }), function(req, res, next) {
    var user = req.user;
    if (user.role != "管理员") {
        res.status(401).json({ message: "无权限查看教师账号" });
    }
    var query = { role: "老师" };
    User.find(query)
        .exec()
        .then(function(data) {
                var teachers = data.map(item => {
                    var teacher = {};
                    teacher._id = item._id;
                    teacher.username = item.username;
                    teacher.name = item.name;
                    teacher.password = item.init_password;
                    return teacher;
                })
                res.json(teachers);
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

router.get('/students', jwt({ secret: config.token_secret }), function(req, res, next) {
    var user = req.user;
    if (user.role == "学员") {
        res.status(401).json({ message: "无权限查看学员账号" });
    }
    var query = { role: "学员" };
    if (user.role == "老师") {
        query = { teacher: user._id, role: "学员" };
    }
    User.find(query)
        .populate('teacher')
        .exec()
        .then(function(data) {
                var students = data.map(item => {
                    var student = {};
                    student._id = item._id;
                    student.username = item.username;
                    student.name = item.name;
                    student.password = item.init_password;
                    student.expired_at = item.expired_at;
                    if (item.teacher) {
                        student.teacher = item.teacher.name;
                    }
                    if (!item.expired_at) {
                        student.status = "未激活";
                    } else if (item.expired_at > Date.now()) {
                        student.status = "已过期";
                    } else {
                        student.status = "已激活";
                    }
                    return student;
                })
                res.status(200).json(students);
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

router.get('/:id', jwt({ secret: config.token_secret }), function(req, res) {
    User.findOne({ _id: req.params.id })
        .exec()
        .then(function(user) {
            res.status(200).json(user);
        }, function(err) {
            logger.error(err);
            res.status(500).json({ message: err });
        });
});

router.put('/:id', jwt({ secret: config.token_secret }), function(req, res) {
    User.findById(req.params.id, function(err, user) {
        if (err)
            res.send(err);
        user.name = req.body.name;
        user.username = req.body.username;
        user.expired_at = req.body.expired_at;
        user.save(function(err) {
            if (err) {
                logger.error(err);
                res.status(500).json({ message: err });
            }

            logger.info(req.user.name + " 更新了用户账号，用户名为：" + user.username + "。" + req.clientIP);
            res.json({ message: '用户账号已成功更新' });
        });
    });
});

module.exports = router;