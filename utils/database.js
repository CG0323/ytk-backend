'use strict'

var config = require('../common.js').config();

var mongoose = require('mongoose');
mongoose.Promise = require('q').Promise;

var options = {
    server: {
        auto_reconnect: true,
        poolSize: 10
    }
};

var connection = mongoose.createConnection(config.mongodb_server, options);

connection.on('error', function(err) {
    console.log(err);
});

exports.connection = connection;