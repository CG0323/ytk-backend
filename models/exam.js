'use strict'

var mongoose = require('mongoose');
mongoose.Promise = require('q').Promise;

var schema = new mongoose.Schema({
    directory: { type: mongoose.Schema.Types.ObjectId, ref: 'Directory' },
    directory_path: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    exam_date: { type: Date },
    duration: Number, // in mm
    right_move_count: Number,
    right_count: Number,
    wrong_count: Number,
    // score: Number,
    // time_bonus: Number,
    total_score: Number,
    status: String
});


schema.index({ directory: 1, user: 1, exam_date: -1 });
mongoose.model('Exam', schema);

module.exports = function(connection) {
    return (connection || mongoose).model('Exam');
};