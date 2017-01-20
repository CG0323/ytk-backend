var express = require('express');
var logger = require('morgan');
var apis = require('./routes/api');
var bodyParser = require('body-parser');
var app = express()

if (app.get('env') === 'development') {
    app.use(logger('dev'));
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/api', apis);


module.exports = app