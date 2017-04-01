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
var Settings = require('../models/settings')(db);
var Sequence = require('../models/sequence')(db);
var Exam = require('../models/exam')(db);
var WrongRecord = require('../models/wrongrecord')(db);
var Issue = require('../models/issue')(db);
var Q = require('q');

router.get('/me', jwt({ secret: secretCallback }), function(req, res) {
    User.findOne({ _id: req.user.iss })
        .populate({ path: 'teacher', select: { _id: 1, name: 1, mail: 1, mail_post_at: 1, welcome_message: 1 } })
        .exec()
        .then(function(user) {
            res.status(200).json({ _id: user._id, username: user.username, name: user.name, role: user.role, teacher: user.teacher, expired_at: user.expired_at, mail: user.mail, mail_post_at: user.mail_post_at, welcome_message: user.welcome_message, quota: user.quota });
        }, function(err) {
            logger.error(err);
            res.status(500).json({ message: err });
        });
});

// 临时接口
router.get('/register-admin1', function(req, res) {
    User.register(new User({ username: config.admin1_username, name: '王工', role: '管理员', expired_at: new Date("2030-12-31") }), config.admin1_password, function(err, user) {
        if (err) {
            logger.error(err);
            res.status(500).send(err);
        } else {
            res.status(200).json({ status: '管理员1注册成功' });
        }
    });
});

// 临时接口
router.get('/register-admin2', function(req, res) {
    User.register(new User({ username: config.admin2_username, name: '祝工', role: '管理员', expired_at: new Date("2030-12-31") }), config.admin2_password, function(err, user) {
        if (err) {
            logger.error(err);
            res.status(500).send(err);
        } else {
            res.status(200).json({ status: '管理员1注册成功' });
        }
    });
});

// 临时接口
router.get('/register-admin3', function(req, res) {
    User.register(new User({ username: config.admin3_username, name: '朱总', role: '管理员', expired_at: new Date("2030-12-31") }), config.admin3_password, function(err, user) {
        if (err) {
            logger.error(err);
            res.status(500).send(err);
        } else {
            res.status(200).json({ status: '管理员1注册成功' });
        }
    });
});

// 临时接口
router.get('/register-admin4', function(req, res) {
    User.register(new User({ username: config.admin4_username, name: '肖总', role: '管理员', expired_at: new Date("2030-12-31") }), config.admin4_password, function(err, user) {
        if (err) {
            logger.error(err);
            res.status(500).send(err);
        } else {
            res.status(200).json({ status: '管理员1注册成功' });
        }
    });
});

// 临时接口
// router.get('/clear', function(req, res, next) {
//     User.remove({ role: "学员" })
//         .exec()
//         .then(function(data) {
//                 res.json(data);
//             },
//             function(err) {
//                 res.status(500).end();
//             }
//         )
// });


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
            var payload = { iss: user._id, role: user.role, name: user.name };
            // if (user.role === "老师") {
            //     payload.name = user.name;
            // }
            var token = jwt_generator.sign(payload, secret, { expiresIn: '24h' });
            logger.info(user.name + " 登录系统。");
            if (user.role != "学员") {
                res.status(200).json({ _id: user._id, name: user.name, username: user.username, role: user.role, token: token, expired_at: user.expired_at, quota: user.quota, mail: user.mail, mail_post_at: user.mail_post_at, welcome_message: user.welcome_message });
            } else { //if it is student, get teacher info
                if (err) {
                    logger.error(err);
                    res.status(500).json({ message: err });
                }
                User.findById(user.teacher, function(err, teacher) {
                    if(teacher){
                        res.status(200).json({ name: user.name, username: user.username, role: user.role, token: token, expired_at: user.expired_at, teacher: { _id: teacher._id, name: teacher.name, mail: teacher.mail, mail_post_at: teacher.mail_post_at, welcome_message: teacher.welcome_message } });
                    }else{
                        res.status(401).json({ message: "数据异常,请联系老师" });
                    }
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
        var payload = { iss: user._id, role: user.role, name: user.name };
        // if (user.role === "老师") {
        //     payload.name = user.name;
        // }
        // var token = jwt_generator.sign({ iss: user_id, _id: user._id, username: user.username, name: user.name, role: user.role }, secret, { expiresIn: expiresIn });
        var token = jwt_generator.sign(payload, secret, { expiresIn: expiresIn });
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
            User.register(new User({ username: data.username, name: data.name, quota: data.quota, role: "老师", init_password: data.password, expired_at: expired_at }), data.password, function(err, user) {
                if (err) {
                    logger.error(err);
                    res.status(500).json({ message: err });
                } else {
                    logger.info(req.user.name + " 创建了教师账号：" + data.username);
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
        return;
    }
    var data = req.body;

    getQuota(req.user.iss)
        .then(function(quota) {
            if (quota && quota < data.sequence) {
                res.status(400).json({ message: "学员配额已用完，请联系管理员申请增加配额" });
            } else {
                User.find({ username: data.username }, function(err, users) {
                    if (users.length > 0) {
                        res.status(400).json({ message: '用户名已被使用' });
                    } else {
                        var settings = getDefaultSettings();
                        Settings.find({})
                            .then(function(settingsList) {
                                if (settingsList.length > 0) {
                                    settings = settingsList[0];
                                }
                                var expired_at = moment().add(settings.trial_days, 'days');
                                User.register(new User({ teacher: user.iss, username: data.username, name: data.name, role: "学员", init_password: data.password, expired_at: expired_at }), data.password, function(err, savedUser) {
                                    if (err) {
                                        logger.error(err);
                                        res.status(500).json({ message: err });
                                    } else {
                                        logger.info(req.user.name + " 创建了学员账号：" + data.username);
                                        IncrementSequence(req.user.iss)
                                            .then(function() {
                                                res.status(200).json({ message: '已成功创建学员账号', user: { _id: savedUser._id, username: savedUser.username, name: savedUser.name, password: savedUser.init_password, teacher: savedUser.teacher } });
                                            });
                                    }
                                });
                            })
                    }

                })
            }
        })





});


router.delete('/:id', jwt({ secret: secretCallback }), function(req, res) {
    User.findById({ _id: req.params.id })
        .exec()
        .then(function(user) {
            logger.info(req.user.name + " 删除了 " + user.username + " 的账号");
            user.remove();
            RemoveRelatedData(req.params.id);
            res.json({ message: '账号已成功删除' });
        }, function(err) {
            logger.error(err);
            res.status(500).json({ message: err });
        })
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
                    teacher.quota = item.quota;
                    return teacher;
                })
                res.json(teachers);
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

router.get('/teachers-and-admins', jwt({ secret: secretCallback }), function(req, res, next) {
    var user = req.user;
    var query = { $or: [{ role: "老师" }, { role: "管理员" }] };
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

router.post('/search-students', jwt({ secret: secretCallback }), function(req, res, next) {
    if (req.user.role == "学员") {
        res.status(401).json({ message: "无权限查看学员账号" });
    }
    var param = req.body;
    var first = param.first;
    var rows = param.rows;
    var search = param.search;
    var teacher = param.teacher;
    var status = param.status;
    var conditions = {};
    conditions['role'] = "学员";
    if (search) {
        conditions = { $or: [{ username: { $regex: search } }, { name: { $regex: search } }] };
    }
    if (teacher) {
        conditions['teacher'] = teacher;
    }
    if (req.user.role == "老师") {
        conditions['teacher'] = req.user.iss;
    }
    if (status) {
        if (status === "已过期") {
            conditions['expired_at'] = { $lt: new Date() };
        } else {
            conditions['expired_at'] = { $gte: new Date() };
        }
    }
    User.find(conditions)
        .sort({ created_at: -1 })
        .skip(first)
        .limit(rows)
        .populate('teacher')
        .exec()
        .then(function(data) {
                User.count(conditions, function(err, c) {
                    if (err) {
                        logger.error(err);
                        res.status(500).json({ message: "获取学员总数失败" });
                    }
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
                    res.status(200).json({
                        totalCount: c,
                        students: students
                    })
                });
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

router.post('/mail', jwt({ secret: secretCallback }), function(req, res) {
    User.findById(req.user.iss, function(err, user) {
        if (err)
            res.status(500).json({ message: err });
        user.mail = req.body.mail;
        if (user.mail && user.mail != "") {
            user.mail_post_at = new Date();
        } else {
            user.mail_post_at = null;
        }

        user.save(function(err) {
            if (err) {
                logger.error(err);
                res.status(500).json({ message: err });
            }
            logger.info(user.username + " 更新了通知信息" + "。");
            res.json({ message: '通知栏已成功设置' });
        });
    });
});

router.post('/welcome', jwt({ secret: secretCallback }), function(req, res) {
    User.findById(req.user.iss, function(err, user) {
        if (err)
            res.status(500).json({ message: err });
        user.welcome_message = req.body.welcome_message;
        user.save(function(err) {
            if (err) {
                logger.error(err);
                res.status(500).json({ message: err });
            }
            logger.info(user.username + " 更新了欢迎信息" + "。");
            res.json({ message: '欢迎信息已成功设置' });
        });
    });
});

router.put('/:id', jwt({ secret: secretCallback }), function(req, res) {
    User.findById(req.params.id, function(err, user) {
        if (err)
            res.send(err);
        user.name = req.body.name;
        user.username = req.body.username;
        user.expired_at = req.body.expired_at;
        user.mail = req.body.mail;
        user.save(function(err) {
            if (err) {
                logger.error(err);
                res.status(500).json({ message: err });
            }

            logger.info(req.user.name + " 更新了用户账号，用户名为：" + user.username + "。");
            res.json({ message: '用户账号已成功更新' });
        });
    });
});

router.post('/resetpsw', jwt({ secret: secretCallback }), function(req, res) {
    if (req.user.role == "学员") {
        res.status(401).json({ message: "无权限重置密码" });
    }
    var userId = req.body.userId;
    var newPassword = req.body.newPassword;
    User.findById(userId)
        .exec()
        .then(function(user) {
            user.setPassword(newPassword, function() {
                user.init_password = newPassword;
                user.save(function(err) {
                    if (err) {
                        logger.error(err);
                        res.status(400).json({ message: '密码修改失败' });
                    }
                    logger.info(req.user.name + " 重置了用户" + user.username + "的密码。");
                    res.status(200).json({ message: '用户密码已成功重置' });
                });
            });
        })
});

router.post('/resetquota', jwt({ secret: secretCallback }), function(req, res) {
    if (req.user.role != "管理员") {
        res.status(401).json({ message: "无权限修改配额" });
    }
    var userId = req.body.userId;
    var newQuota = req.body.quota;
    User.findById(userId)
        .exec()
        .then(function(user) {
            user.quota = newQuota;
            user.save(function(err) {
                if (err) {
                    logger.error(err);
                    res.status(400).json({ message: '配额修改失败' });
                }
                logger.info(req.user.name + " 修改了老师" + user.username + "的学员配额。");
                res.status(200).json({ message: '配额已成功修改' });
            });
        })
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
                        logger.info(user.name + " 修改了密码。");
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

function getDefaultSettings() {
    var settings = {};
    settings.price_3_months = 10;
    settings.price_12_months = 30;
    settings.trial_days = 15;
    settings.exam_duration = 3;
    settings.score_per_turn = 10;
    settings.time_bonus_per_second = 5;
    settings.default_pass_score = 600;
    return settings;
}

function getQuota(userId) {
    var defer = Q.defer();
    User.findOne({ _id: userId })
        .exec()
        .then(function(user) {
            defer.resolve(user.quota);
        }, function(err) {
            logger.error(err);
            defer.reject(err);
        });
    return defer.promise;
}

function IncrementSequence(userId) {
    var defer = Q.defer();
    Sequence.find({ user: userId })
        .exec()
        .then(function(data) {
                var sequence = null;
                if (data.length > 0) {
                    sequence = data[0];
                    sequence.sequence += 1;
                } else {
                    sequence = new Sequence();
                    sequence.user = userId;
                    sequence.sequence = 2;
                }
                sequence.save(function(err) {
                    if (err) {
                        logger.error(err);
                    }
                    defer.resolve();
                });
            },
            function(err) {
                defer.reject();
                logger.error(err);
            }
        )
    return defer.promise;
}

function RemoveRelatedData(userId) {
    console.log(userId);
    Exam.remove({ user: userId }, function() {});
    WrongRecord.remove({ user: userId }, function() {});
    Issue.remove({ submitter: userId }, function() {});
}


//临时接口
router.post('/student-migration', jwt({ secret: secretCallback }), function(req, res) {
    var user = req.user;
    var data = req.body;
    User.find({ username: data.username }, function(err, users) {
        if (users.length > 0) {
            res.status(400).json({ message: '用户名已被使用' });
        } else {
            var expired_at = new Date(data.expired_at);
            User.register(new User({ teacher: data.teacher, username: data.username, name: data.name, role: "学员", init_password: data.password, expired_at: expired_at }), data.password, function(err, savedUser) {
                if (err) {
                    logger.error(err);
                    res.status(500).json({ message: err });
                } else {
                    logger.info(req.user.name + " 创建了学员账号：" + data.username);
                    IncrementSequence(req.user.iss)
                        .then(function() {
                            res.status(200).json({ message: '已成功创建学员账号', user: { _id: savedUser._id, username: savedUser.username, name: savedUser.name, password: savedUser.init_password, teacher: savedUser.teacher } });
                        });
                }
            });
        }
    })
});

module.exports = router;