var express = require('express');
var directories = require('./directories.js');
var problems = require('./problems.js');
var certificates = require('./certificates.js');
var wrongrecords = require('./wrongrecords.js');
var router = express.Router();

router.use('/directories', directories);
router.use('/problems', problems);
router.use('/certificates', certificates);
router.use('/wrongrecords', wrongrecords);
module.exports = router;