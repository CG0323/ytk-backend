'use strict';

function random(length) {
    if (length === 0) return null;

    var total = 1;
    for (let i = 0; i < length; i++) total *= 10;

    const base = total - total / 10,
        fill = total - base - 1;

    return base + Math.floor(Math.random() * fill);
}

function generate() {
    var now = new Date();
    var prefix = (now.toISOString().replace(/[-T:Z\.]/g, '').substr(0, 16)).toString();
    var random = random(4);
    return prefix + random;
}



module.exports.generate = generate;