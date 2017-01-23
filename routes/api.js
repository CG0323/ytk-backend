var express = require('express');
var directories = require('./directories.js');
var problems = require('./problems.js');
var router = express.Router();

router.all('/', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

router.use('/directories', directories);
router.use('/problems', problems);

module.exports = router;