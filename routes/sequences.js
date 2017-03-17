var express = require('express');
var db = require('../utils/database.js').connection;
var Sequence = require('../models/sequence')(db);
var router = express.Router();
var Q = require('q');
var logger = require('../utils/logger.js');
var config = require('../common.js').config();
var jwt = require('express-jwt');
var secretCallback = require('../utils/secretCallback.js').secretCallback;

router.post('/', jwt({ secret: secretCallback }), function(req, res) {
    var user = req.user;
    var data = req.body;
    if (!data._id) { // create new
        var sequence = new Sequence(data);
        sequence.user = user._id;
        sequence.save(function(err, savedSequence, numAffected) {
            if (err) {
                res.status(500).json({ message: err });
            } else {
                logger.info(user.name + "更新了学员序号");
                res.status(200).json({ message: "学员序号已成功保存" });
            }
        });
    } else { // update
        Sequence.findById(data._id, function(err, sequence) {
            if (err) {
                logger.error(err);
                res.status(500).json({ message: err });
            }
            sequence.sequence = data.sequence;
            sequence.save(function(err, savedSequence, numAffected) {
                if (err) {
                    res.status(500).json({ message: err });
                } else {
                    logger.info(user.name + "更新了学员序号");
                    res.status(200).json({ message: "学员序号已成功更新" });
                }
            });
        })
    }
});

router.get('/', jwt({ secret: secretCallback }), function(req, res, next) {
    var user = req.user;
    Sequence.find({ user: user.iss })
        .exec()
        .then(function(data) {
                if (data.length > 0) {
                    res.json({ sequence: data[0].sequence });
                } else {
                    res.json({ sequence: 1 });
                }
            },
            function(err) {
                res.status(500).json({ message: err });
            }
        )
});

module.exports = router;