var express = require('express');
var db = require('../utils/database.js').connection;
var Certificate = require('../models/certificate')(db);
var router = express.Router();
var Q = require('q');
var jwt = require('express-jwt');
var config = require('../common.js').config();
var logger = require('../utils/logger.js');
var secretCallback = require('../utils/secretCallback.js').secretCallback;

router.post('/', jwt({ secret: secretCallback }), function(req, res) {
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
                    res.json({ error: err, message: "更新证书失败" });
                }
                logger.info(req.user.iss + " 更新了证书，证书编号为：" + certificate.certificate_id + "。" + req.clientIP);
                res.json({ message: '证书已成功更新' });
            });
        } else {
            var certificate = new Certificate(data);
            certificate.save(function(err, savedCertificate, numAffected) {
                if (err) {
                    res.status(500).json({ error: err, message: "保存证书失败" });
                } else {
                    res.status(200).json({ message: "证书已保存" });
                }
            });
        }
    })

});

router.post('/bulk', jwt({ secret: secretCallback }), function(req, res) {
    var certificates = req.body;

    var bulk = Certificate.collection.initializeUnorderedBulkOp();
    for (var i = 0; i < certificates.length; i++) {
        bulk.find({ certificate_id: certificates[i].certificate_id }).upsert().updateOne(certificates[i]);
    }
    bulk.execute();
    res.status(200).json({ message: '成功添加' + certificates.length + "条证书记录" });

});

router.get('/', jwt({ secret: secretCallback }), function(req, res, next) {
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

// router.get('/clear', function(req, res, next) {
//     Certificate.find()
//         .remove()
//         .exec()
//         .then(function(certificates) {
//                 res.json(certificates);
//             },
//             function(err) {
//                 res.status(500).end();
//             }
//         )
// });

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
                res.status(500).json({ error: err, message: "查询失败" });
            }
        )
});

// router.post('/search', jwt({ secret: secretCallback }), function(req, res, next) {
router.post('/search', jwt({ secret: secretCallback }), function(req, res, next) {
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
                        res.status(500).json({ error: "获取证书总数失败" });
                    }
                    res.status(200).json({
                        totalCount: c,
                        certificates: certificates
                    })
                });
            },
            function(err) {
                res.status(500).json({ error: err });
            }
        )
});

router.delete('/:id', jwt({ secret: secretCallback }), function(req, res, next) {
    var id = req.params.id;
    Certificate.remove({ _id: id })
        .exec()
        .then(function(data) {
                res.json({ message: "证书已成功删除" });
            },
            function(err) {
                res.status(500).json({ error: err, message: "证书删除失败" });
            }
        )
});

module.exports = router;