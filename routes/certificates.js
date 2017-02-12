var express = require('express');
var db = require('../utils/database.js').connection;
var Certificate = require('../models/certificate')(db);
var router = express.Router();
var Q = require('q');

router.post('/', function(req, res) {
    var data = req.body;
    Certificate.find({ certificate_id: data.certificate_id }, function(err, certificates) {

        if (certificates.length > 0) {
            var certificate = certificates[0];
            certificate.name = data.name;
            certificate.content = data.content;
            certificate.date = data.date;
            certificate.save(function(err) {
                if (err) {
                    logger.error(err);
                    res.send(err);
                }
                logger.info(req.user.name + " 更新了证书，证书编号为：" + certificate.certificate_id + "。" + req.clientIP);
                res.json({ message: '证书已成功更新' });
            });
        } else {
            var certificate = new Certificate(data);
            certificate.save(function(err, savedCertificate, numAffected) {
                if (err) {
                    res.status(500).send(err);
                } else {
                    res.status(200).json({ message: "证书已保存" });
                }
            });
        }
    })

});

router.post('/bulk', function(req, res) {
    var certificates = req.body;

    var bulk = Certificate.collection.initializeUnorderedBulkOp();
    for (var i = 0; i < certificates.length; i++) {
        bulk.find({ certificate_id: certificates[i].certificate_id }).upsert().updateOne(certificates[i]);
    }
    bulk.execute();
    res.status(200).json({ message: '成功添加' + certificates.length + "条证书记录" });

});

router.get('/', function(req, res, next) {
    Certificate.find()
        .exec()
        .then(function(certificates) {
                res.json(certificates);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

router.get('/clear', function(req, res, next) {
    Certificate.find()
        .remove()
        .exec()
        .then(function(certificates) {
                res.json(certificates);
            },
            function(err) {
                res.status(500).end();
            }
        )
});

router.get('/client-search/:search', function(req, res, next) {
    var search = req.params.search;
    var conditions = { $or: [{ certificate_id: search }, { name: search }] };
    Certificate.find(conditions)
        .sort({ date: -1 })
        .exec()
        .then(function(certificates) {
                res.json(certificates);
            },
            function(err) {
                res.status(500).send(err);
            }
        )
});

router.post('/search', function(req, res, next) {
    var param = req.body;
    var first = param.first;
    var rows = param.rows;
    var search = param.search;
    var conditions = {};
    if (search) {
        conditions = { $or: [{ certificate_id: { $regex: search } }, { name: { $regex: search } }] };
    }
    Certificate.find(conditions)
        .sort({ date: -1 })
        .skip(first)
        .limit(rows)
        .exec()
        .then(function(certificates) {
                Certificate.count(conditions, function(err, c) {
                    if (err) {
                        logger.error(err);
                        res.status(500).send("获取证书总数失败");
                    }
                    res.status(200).json({
                        totalCount: c,
                        certificates: certificates
                    })
                });
            },
            function(err) {
                res.status(500).send(err);
            }
        )
});



module.exports = router;