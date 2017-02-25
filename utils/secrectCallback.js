var db = require('../utils/database.js').connection;
var User = require('../models/user.js')(db);
var logger = require('../utils/logger.js');
var config = require('../common.js').config();

var secretCallback = function(req, payload, done) {
    var userId = payload.iss;
    User.findById(userId, function(err, user) {
        if (err) {
            logger.error(err);
            return done(err);
        }
        if (!user.last_key) {
            return done(new Error('missing_secret'));
        }
        var secret = user.last_key;
        done(null, secret);

    });
};

exports.secretCallback = secretCallback;