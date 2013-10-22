/**
 * Entry point for the LENS Listener.
 *
 * Created by: Julian Jewel
 *
 */
var config = require('config');
// Export config, so that it can be used anywhere
module.exports.config = config;

var _ = require('underscore');
var S = require('string');
var fs = require('fs');
var jsonpath = require('JSONPath');
var request = require('request');
var Log = require('vcommons').log;
var logger = Log.getLogger('LENS', config.log);
var HashMap = require('hashmap').HashMap;

UTIL = {};
UTIL.XML = require('vcommons').objTree;
// Globally available for conversion
var xotree = new UTIL.XML.ObjTree();
var dom = require('xmldom').DOMParser;
// Feed transformer created by John May
var feedTransformer = require('../lib/feedTransformer.js');
var retry = require('retry');
// Cache Clients
var notificationConfigMap = new HashMap();

logger.trace('Setting up Configuration Cache');
for (var i = 0; i < config.notification.length; i++) {
    logger.trace('Setting up Configuration Cache:', config.notification[i]);
    notificationConfigMap.set(config.notification[i].name, config.notification[i]);
}

logger.info('Setting up Redis Connection to ', config.redis.port, config.redis.host);
var redis = require("redis");
var client = redis.createClient(config.redis.port, config.redis.host);

logger.trace('Authenticating Redis with ' + config.redis.auth);

client.auth(config.redis.auth, function (err) {
	if(err) {
		logger.error('Could not authenticate ' +  config.redis.host + ':' + config.redis.port, err);
		throw err;
	}
	logger.info('Authenticated ' +  config.redis.host + ':' + config.redis.port);
	// Start the process
	logger.info('Redis Listening to ' + config.redis.channel);
	logger.trace('Popping Data from ' + config.redis.channel + ' and calling callback');
	client.blpop(config.redis.channel, '0', callback);

	logger.info(('Listening on Redis Channel-' + (config.redis.host || 'localhost') + ':' + (config.redis.port || '6379')));

});

// Do client.auth

function processErrorAndRollback(err, evt) {
    logger.error('Error occured during processing of event:' + err);
    // Something goes wrong - push event back to queue
    client.lpush(evt[0], evt[1]);
    // Listen again
    client.blpop(config.redis.channel, '0', callback);
    logger.error('Rolled back element to channel:' + config.redis.channel);
}

function callback(err, evt) {

    if (err) {
		if(evt) {
			if (!_.isArray(evt)) {
				processErrorAndRollback(err, evt);
				return;
			}
		} else {
			// retry globally if there is no element
			throw err;
		}
    }

    var channel = evt[0];
    var object = evt[1];


    if (object) {
        logger.trace("Evicted from Queue:" + channel + " Object: " + object);

        var jsonObj = JSON.parse(object);
        var collection = jsonObj.ns;
        var record = jsonObj.o;

        logger.trace("Checking if there is a global subscription for collection: ", collection);
        // Check global subscriptions (subscribed to all changes in a collection)
        var globalSubscription = config.globalSubscriptions[collection];
        logger.trace("Found global subscription for collection: ", globalSubscription);
        // Get SSN
        var ssn = jsonpath.eval(jsonObj.o, '$..nc:PersonSSNIdentification.nc:IdentificationID');
        // Check whether the SSN has a subscription
        // Query CRUD - http://localhost:3001/core/serviceTreatmentRecords.subscriptions?query={"subscription:Subscription.subscription:CommonData.nc:Person.nc:PersonSSNIdentification.nc:IdentificationID":"987654321"}

        var operation = retry.operation(config.ecrud.retry);
		// Get subscriptions by SSN
        operation.attempt(function (currentAttempt) {
            logger.info('Attempt ' + currentAttempt + ':' + config.ecrud.url + '/'
                 + collection + '.subscriptions?query={"subscription:Subscription.subscription:CommonData.nc:Person.nc:PersonSSNIdentification.nc:IdentificationID":"'
                 + ssn + '"}');
            request(config.ecrud.url + '/'
                 + collection + '.subscriptions?query={"subscription:Subscription.subscription:CommonData.nc:Person.nc:PersonSSNIdentification.nc:IdentificationID":"'
                 + ssn + '"}', function (error, response, body) {

                if (operation.retry(error)) {
                    logger.error('Retry failed with error:', error, 'Attempt:', currentAttempt);
                    return;
                }

                if (!error && response.statusCode == 200) {
                    var json = JSON.parse(body);
                    json = json ? json : {};
                    logger.trace('CRUD returned subscriptions:  ', json);
                    if (json.length > 0) {
                        // Get the Subscriber ID
                        for (var i = 0; i < json.length; i++) {
                            var subData = json[i];
                            var subId = subData['subscription:Subscription']['subscription:CommonData']['vler:Subscription']['vler:Addressing']['vler:ReplyTo']['vler:SubscriberId'];
                            var jsonSubId = JSON.parse('[{"name":"' + subId + '"}]');

                            logger.trace('Adding to list of subscribers', jsonSubId);

                            if (_.isUndefined(globalSubscription)) {
                                globalSubscription = jsonSubId;
                            } else {
                                globalSubscription[globalSubscription.length] = jsonSubId;
                            }
                        }
                    }
                    logger.trace('The subscriptions for this message:', globalSubscription);
                    if (_.isUndefined(globalSubscription) || _.isEmpty(globalSubscription)) {
                        // No configuration
                        // Listen again
                        logger.trace('Ignoring message', evt[1]);
                        logger.info('Retrieving next message from channel', config.redis.channel);
                        client.blpop(config.redis.channel, '0', callback);
                        return;
                    }
                    for (var i = 0; i < globalSubscription.length; i++) {
                        var notificationConfigName = globalSubscription[i].name;
                        var notificationConfig = notificationConfigMap.get(notificationConfigName);
                        logger.trace('Finding notification configuration for ', notificationConfigName);
                        if (_.isUndefined(notificationConfig)) {
                            continue;
                        }
                        var toSend = JSON.stringify(jsonObj.o);
                        if (S(notificationConfig.accept).startsWith("application/atom+xml")) {
                            logger.trace('Trying to convert JSON Obj to NIEM', jsonObj.o);
							try {
								var jsonFeed = feedTransformer.niemDocJsObjToJsonFeed(jsonObj.o, jsonObj.o._id, jsonObj.o.uploadDate);
								logger.trace('Converted JSON Feed', jsonFeed);
								toSend = xotree.writeXML(jsonFeed);
								logger.trace('Converted XML Feed', toSend);
							} catch (err) {
								logger.error('JSON could not converted to feed', err);
								throw err;
							}
                        }

						client.lpush(notificationConfig.channel, toSend);
						if (!_.isUndefined(config.trackSubscriptions[collection])) {
							logger.trace('Track notification for collection ', collection);
							trackNotifications(collection, json, jsonObj, function (err) {
								if (err) {
									logger.error('Error occured during tracking of notification ', collection);
									processErrorAndRollback(err, evt);
									return;
								}
								logger.info('Retrieving next message from channel', config.redis.channel);
								client.blpop(config.redis.channel, '0', callback);
							});
						} else {
							logger.info('No tracking for notification defined. Retrieving next message from channel', config.redis.channel);
							client.blpop(config.redis.channel, '0', callback);
							return;
						}
					}
                } else {
                    processErrorAndRollback(err, evt);
                    return;
                }
            });
        });
    }
}

function trackNotifications(collection, subscription, data, callback) {
    logger.trace('Tracking of notification is required');
    if (subscription.length > 0) {
        // Add the document log to all subscribers
        for (var i = 0; i < subscription.length; i++) {
            var subData = subscription[i];
            if (!_.isUndefined(subData)) {
                if (_.isUndefined(subData.track)) {
                    subData.track = [];
                }
                var track = {};
                track.date = new Date();
                track.document = data;
                subData.track[subData.track.length] = track;
                // TODO: Implement Retry
                var id = subData._id;
                delete subData._id;

                logger.trace('Tracking ', subData);
                var operation = retry.operation(config.ecrud.retry);
                operation.attempt(function (currentAttempt) {
                    logger.info('Trying PUT on ' + config.ecrud.url + '/' + collection + '.subscriptions' + '/' + id, 'Data:' + subData);
                    request({
                        url : config.ecrud.url + '/' + collection + '.subscriptions' + '/' + id,
                        headers : {
                            "Content-Type" : "application/json"
                        },
                        method : 'PUT',
                        body : JSON.stringify(subData)
                    }, function (error, response, body) {
                        if (operation.retry(error)) {
                            logger.error('Retry failed with error:', error, 'Attempt:', currentAttempt);
                            return;
                        }
                        if (!error && response.statusCode == 201) {
                            logger.info('Successfully stored subscription. Processing callback!');
                            // Listen again
                            callback(null);
                        } else {
                            logger.info('Calling failure Callback with error', error);
                            callback(new Error("Error could not store Subscription in CRUD. Error:" + error));
                        }
                    });
                });

            }
        }
    }
}

// Default exception handler
process.on('uncaughtException', function (err) {
    logger.error('Caught exception: ' + err);
	// Continue listening
	client.blpop(config.redis.channel, '0', callback);
});
// Ctrl-C Shutdown
process.on('SIGINT', function () {
    logger.info("Shutting down from  SIGINT (Crtl-C)");
    process.exit()
})
// Default exception handler
process.on('exit', function (err) {
    logger.info("Exiting.. Error:", err);
    if (!_.isUndefined(client)) {
        // Cleanup
    }
});
