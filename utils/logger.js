'use strict'

var config = require('../common.js').config();
var log4js = require("log4js");
var log4js_config = require("../log4js.json");
log4js.configure(log4js_config);

var LogFile = log4js.getLogger(config.log_type);

// LogFile.trace('This is a Log4js-Test');
// LogFile.debug('We Write Logs with log4js');
// LogFile.info('You can find logs-files in the log-dir');
// LogFile.warn('log-dir is a configuration-item in the log4js.json');
// LogFile.error('In This Test log-dir is : \'./logs/log_test/\'');

module.exports = LogFile;