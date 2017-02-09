var express = require('express');
var passport = require('passport');
var db = require('../utils/database.js').connection;
var User = require('../models/user.js')(db);
var router = express.Router();
var logger = require('../utils/logger.js');
var config = require('../common.js').config();
// 临时接口
router.get('/register-admin', function(req, res) {
    User.register(new User({ username: config.admin_username, name: '管理员', role: '管理员' }), config.admin_password, function(err, user) {
        if (err) {
            logger.error(err);
            res.status(500).send(err);
        } else {
            res.status(200).json({ status: '管理员注册成功' });
        }
    });
});

router.post('/logout', function(req, res) {
    req.logout();
    res.status(200).json({ status: 'Bye!' });
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
        req.logIn(user, function(err) {
            if (err) {
                logger.error(err);
                return res.status(500).send('无法登录该用户');
            }
            logger.info(user.name + " 登录系统。" + req.clientIP);
            res.status(200).json(user);
        });
    })(req, res, next);
});


router.post('/', function(req, res) {
    if (!req.isAuthenticated()) {
        res.status(401).send("请先登录");
    }

    var data = req.body;
    User.find({ username: data.username }, function(err, users) {
        if (users.length > 0) {
            res.status(400).send('系统中已存在该账号');
        } else {
            User.register(new User({ username: data.username, name: data.name, role: data.role }), data.password, function(err, user) {
                if (err) {
                    logger.error(err);
                    res.status(500).send(err);
                } else {
                    res.status(200).json({ message: '已成功创建账号' });
                }
            });
        }

    })
});

router.delete('/:id', function(req, res) {
    if (!req.isAuthenticated()) {
        res.status(401).send("请先登录");
    }
    User.remove({ _id: req.params.id }, function(err, user) {
        if (err) {
            logger.error(err);
            res.send(err);
        }
        logger.info(req.user.name + " 删除了 " + req.params.id + " 的账号" + req.clientIP);
        res.json({ message: '账号已成功删除' });
    });
});

router.get('/', function(req, res, next) {
    // if (!req.isAuthenticated()) {
    //     res.status(401).send("请先登录");
    // }
    var query = {};
    var role = req.query.role;
    if (role == "teacher") {
        query = { role: '老师' };
    } else if (role == "student") {
        query = { role: '学员' };
    }
    User.find(query)
        .exec()
        .then(function(users) {
                res.json(users);
            },
            function(err) {
                res.status(500).send(err);
            }
        )
});

router.get('/:id', function(req, res) {
    if (!req.isAuthenticated()) {
        res.status(401).send("请先登录");
    }
    User.findOne({ _id: req.params.id })
        .exec()
        .then(function(user) {
            res.status(200).json(user);
        }, function(err) {
            logger.error(err);
            res.status(500).send(err);
        });
});

router.put('/:id', function(req, res) {
    User.findById(req.params.id, function(err, user) {
        if (err)
            res.send(err);
        user.name = req.body.name;
        user.username = req.body.username;
        user.role = req.body.role;
        user.setPassword(req.body.password, function() {
            user.save(function(err) {
                if (err) {
                    logger.error(err);
                    res.send(err);
                }

                logger.info(req.user.name + " 更新了用户账号，用户名为：" + user.username + "。" + req.clientIP);
                res.json({ message: '用户账号已成功更新' });
            });
        });
    });
});

module.exports = router;