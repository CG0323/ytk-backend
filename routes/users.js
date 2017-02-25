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
var secretCallback = require('../utils/secretCallback.js').secretCallback;


router.get('/me', jwt({ secret: secretCallback }), function(req, res) {
    User.findOne({ _id: req.user.iss })
        .populate({ path: 'teacher', select: { _id: 1, name: 1 } })
        .exec()
        .then(function(user) {
            res.status(200).json({ _id: user._id, username: user.username, name: user.name, role: user.role, teacher: user.teacher, expired_at: user.expired_at });
        }, function(err) {
            logger.error(err);
            res.status(500).json({ message: err });
        });
});

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
router.get('/register-teacher2', function(req, res) {
    User.register(new User({ username: config.teacher2_username, name: '王老师', role: '老师', init_password: config.teacher_password, expired_at: new Date("2030-12-31") }), config.teacher_password, function(err, user) {
        if (err) {
            logger.error(err);
            res.status(500).send(err);
        } else {
            res.status(200).json({ status: '老师注册成功' });
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
            return res.status(500).json({ message: err });
        }
        if (!user) {
            return res.status(401).json({ message: "用户名或密码错误" });
        }
        var expired_at = user.expired_at;
        if (!expired_at) {
            return res.status(401).json({ message: "账号尚未激活，请联系老师" });
        } else if (expired_at < new Date()) {
            return res.status(401).json({ message: "账号已过期，请联系老师" });
        } else {
            var secret = generateSecret();
            user.last_key = secret;
            user.save(); // no check for now, not sure if it is ok
            var token = jwt_generator.sign({ iss: user._id, role: user.role }, secret, { expiresIn: '24h' });
            logger.info(user.name + " 登录系统。" + req.clientIP);
            if (user.role != "学员") {
                res.status(200).json({ name: user.name, username: user.username, role: user.role, token: token, expired_at: user.expired_at });
            } else { //if it is student, get teacher info
                if (err) {
                    logger.error(err);
                    res.status(500).json({ message: err });
                }
                User.findById(user.teacher, function(err, teacher) {
                    res.status(200).json({ name: user.name, username: user.username, role: user.role, token: token, expired_at: user.expired_at, teacher: { _id: teacher._id, name: teacher.name } });
                })
            }
        }
    })(req, res, next);
});

router.get('/token', jwt({ secret: secretCallback }), function(req, res) {
    var userId = req.user.iss;
    User.findById(userId, function(err, user) {
        if (err) {
            logger.error(err);
            res.status(500).json({ message: err });
        }
        var secret = user.last_key;
        var user_expired_in = (user.expired_at.getTime() - Date.now()) / 3600000; // in hours
        var expiresIn = '24h';
        if (user_expired_in < 24) {
            expiresIn = Math.floor(user_expired_in) + 'h';
        }
        // var token = jwt_generator.sign({ iss: user_id, _id: user._id, username: user.username, name: user.name, role: user.role }, secret, { expiresIn: expiresIn });
        var token = jwt_generator.sign({ iss: user_id, role: user.role }, secret, { expiresIn: expiresIn });
        res.status(200).json({ token: token });
    });


});

router.post('/teacher', jwt({ secret: secretCallback }), function(req, res) {
    var user = req.user;
    if (user.role != "管理员") {
        res.status(401).json({ message: "无权限创建教师账号" });
    }
    var data = req.body;
    User.find({ "$or": [{ username: data.username }, { name: data.name }] }, function(err, users) {
        if (users.length > 0) {
            res.status(400).json({ message: '用户名或教师姓名已被使用' });
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

router.post('/student', jwt({ secret: secretCallback }), function(req, res) {
    var user = req.user;
    if (user.role == "学员") {
        res.status(401).json({ message: "无权限创建学员账号" });
    }
    var data = req.body;
    User.find({ username: data.username }, function(err, users) {
        if (users.length > 0) {
            res.status(400).json({ message: '用户名已被使用' });
        } else {
            var expired_at = moment().add(15, 'days');

            User.register(new User({ teacher: user.iss, username: data.username, name: data.name, role: "学员", init_password: data.password, expired_at: expired_at }), data.password, function(err, savedUser) {
                if (err) {
                    logger.error(err);
                    res.status(500).json({ message: err });
                } else {
                    logger.info(user.name + " 创建了学员账号：" + data.username);
                    res.status(200).json({ message: '已成功创建学员账号', user: { _id: savedUser._id, username: savedUser.username, name: savedUser.name, password: savedUser.init_password, teacher: savedUser.teacher } });
                }
            });
        }

    })
});


router.delete('/:id', jwt({ secret: secretCallback }), function(req, res) {
    User.remove({ _id: req.params.id }, function(err, user) {
        if (err) {
            logger.error(err);
            res.status(500).json({ message: err });
        }
        logger.info(req.user.iss + " 删除了 " + req.params.id + " 的账号" + req.clientIP);
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

router.get('/teachers', jwt({ secret: secretCallback }), function(req, res, next) {
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

router.get('/students', jwt({ secret: secretCallback }), function(req, res, next) {
    var user = req.user;
    if (user.role == "学员") {
        res.status(401).json({ message: "无权限查看学员账号" });
    }
    var query = { role: "学员" };
    if (user.role == "老师") {
        query = { teacher: user.iss, role: "学员" };
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
                    } else if (item.expired_at < Date.now()) {
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

router.get('/:id', jwt({ secret: secretCallback }), function(req, res) {
    User.findOne({ _id: req.params.id })
        .exec()
        .then(function(user) {
            res.status(200).json(user);
        }, function(err) {
            logger.error(err);
            res.status(500).json({ message: err });
        });
});

router.put('/:id', jwt({ secret: secretCallback }), function(req, res) {
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

            logger.info(req.user.iss + " 更新了用户账号，用户名为：" + user.username + "。" + req.clientIP);
            res.json({ message: '用户账号已成功更新' });
        });
    });
});

router.post('/changepsw', jwt({ secret: secretCallback }), function(req, res) {
    User.findById(req.user.iss, function(err, user1) {
        if (err)
            res.status(500).json({ message: err });
        User.authenticate()(user1.username, req.body.password, function(err, user, options) {
            if (err) {
                res.status(400).json({ message: '旧密码错误' });
            } else if (user === false) {
                res.status(400).json({ message: '旧密码错误' });
            } else {
                user.setPassword(req.body.newPassword, function() {
                    user.init_password = "已修改";
                    user.save(function(err) {
                        if (err) {
                            logger.error(err);
                            res.status(400).json({ message: '密码修改失败' });
                        }
                        logger.info(user.name + " 修改了密码。" + req.clientIP);
                        res.status(200).json({ message: '用户密码已成功更新' });
                    });
                });
            }
        });
    });

});

function generateSecret() {
    var total = 1;
    for (let i = 0; i < 6; i++) {
        total *= 10;
    }
    var base = total - total / 10;
    var fill = total - base - 1;

    var random = base + Math.floor(Math.random() * fill);
    return random.toString();
}


module.exports = router;