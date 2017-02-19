var express = require('express');
var db = require('../utils/database.js').connection;
var WrongRecord = require('../models/wrongrecord')(db);
var router = express.Router();
var Q = require('q');

router.post('/', function(req, res) {
    var data = req.body;
    WrongRecord.find({ user: data.user, problem: data.problem })
        .exec()
        .then(function(records) {
            if (records.length > 0) { //aready exist
                res.status(200).json({ message: "一错再错..." })
            } else {
                var wrongRecord = new WrongRecord(data);
                wrongRecord.save(function(err, savedRecord, numAffected) {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        res.status(200).json({ _id: savedRecord._id });
                    }
                });
            }
        })

});

// 临时接口
router.get('/', function(req, res, next) {
    WrongRecord.find({})
        .populate('problem')
        .exec()
        .then(function(records) {
                res.json(records);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

router.get('/user/:userId', function(req, res, next) {
    var userId = req.params.userId;
    WrongRecord.find({ user: userId })
        .populate('problem')
        .exec()
        .then(function(records) {
                res.json(records);
            },
            function(err) {
                res.status(500).end();
            }
        )
});



router.delete('/:id', function(req, res, next) {
    var id = req.params.id;
    WrongRecord.remove({ _id: id })
        .exec()
        .then(function(data) {
                res.json({ message: "错题记录已成功删除" });
            },
            function(err) {
                res.status(500).json({ error: err, message: "错题记录删除失败" });
            }
        )
});


module.exports = router;