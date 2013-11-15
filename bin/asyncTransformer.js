var config = require('config');
// Export config, so that it can be used anywhere
module.exports.config = config;

var _ = require('underscore');
var Log = require('vcommons').log;
var logger = Log.getLogger('ASYNCTRANSFORMER', config.log);
module.exports.logger = logger;
var JsonFormatter = require('vcommons').jsonFormatter;
var CryptoJS = require("crypto-js");
var cluster = require("cluster");
var numCPUs = require('os').cpus().length;
var redis = require("redis");
var RedisQueue = require("redisqueue");
var redis = require("redis");
//  Transformer
var transformer = require(config.transformer.file);

// Cluster Setup for LENS
if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('online', function (worker) {
        logger.info('A worker with #' + worker.id);
    });
    cluster.on('listening', function (worker, address) {
        logger.info('A worker is now connected to ' + address.address + ':' + address.port);
    });
    cluster.on('exit', function (worker, code, signal) {
        logger.info('worker ' + worker.process.pid + ' died');
    });
} else {

	var client = redis.createClient(config.redis.port, config.redis.host);
    client.auth(config.redis.auth, function (err) {
        if (err) {
            logger.error('Could not authenticate ' + config.redis.host + ':' + config.redis.port, err);
            throw err;
        }
        logger.info('Authenticated ' + config.redis.host + ':' + config.redis.port);

        new RedisQueue(config.redis, function (data, err, callback) {
            if (_.isUndefined(data)) {
                logger.error("Received empty object", data);
                logger.error("Possible elements in processing queue", data);
                return callback(new Error("Received empty object"));
            }

            transformer.transform(data, config.transformer.options, function (response, err) {
				if(err) {
					return callback(err);
				}
				
				if(_.isUndefined(response) || _.isEmpty(response)) {
					// Filter empty
					return callback();
				}

				if (!_.isUndefined(config.redis.encryption) && config.redis.encryption.enabled) {
					var encrypted = CryptoJS.AES.encrypt(response, config.redis.encryption.passPhrase, {
							format : JsonFormatter
						});
					client.lpush(config.redis.outputChannel, encrypted);
				} else {
					client.lpush(config.redis.outputChannel, response);
				}
				return callback();
			});
        });
    });
}

// Default exception handler
process.on('uncaughtException', function (err) {
    logger.error('Caught exception: ' + err);
    process.exit()
});
// Ctrl-C Shutdown
process.on('SIGINT', function () {
    logger.info("Shutting down from  SIGINT (Crtl-C)");
    process.exit()
})
// Default exception handler
process.on('exit', function (err) {
    logger.info("Exiting.. Error:", err);
});
