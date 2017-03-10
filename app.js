var express = require('express');
var logger = require('morgan');
var apis = require('./routes/api');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var db = require('./utils/database.js').connection;
var users = require('./routes/users');
var wechat = require('./routes/wechat');
var app = express()
var jwt = require('express-jwt');
var config = require('./common.js').config();

if (app.get('env') === 'development') {
    app.use(logger('dev'));
}

app.use(log4jsLogger);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(passport.initialize());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

app.use('/api', apis);
app.use('/users', users);
// app.use('/wechat', wechat);

// passport config
var User = require('./models/user')(db);
passport.use(new LocalStrategy(User.authenticate()));


// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.json({
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
        message: err.message,
        error: err
    });
});

function log4jsLogger(req, res, next) {
    // req.clientIP = getClientIp(req);
    next();
}

function getClientIp(req) {
    return req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
};

module.exports = app