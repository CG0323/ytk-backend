var nl = require('nodeload');
var loadtest = nl.run({
    name: 'DirectoryTree',
    host: 'api.yitongkang.com',
    port: 80,
    numClients: 20,
    timeLimit: 60,
    targetRps: 200,
    stats: ['latency', 'result-codes', { name: 'http-errors', successCodes: [200], log: 'http-errors.log' }],
    requestGenerator: function(client) {
        return client.request('GET', "/api/directories/tree");
    }
});
loadtest.on('end', function() { process.exit(0); });