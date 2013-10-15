/**
 * Entry point for the LENS Listener. 
 *
 * Created by: Julian Jewel
 *
 */
var config = require('config');
// Export config, so that it can be used anywhere
module.exports.config = config;

var redis = require('redis');
var _ = require('underscore');
var S = require('string');
var fs = require('fs');
var jsonpath = require('JSONPath');
var request = require('request');
UTIL = {};
UTIL.XML = require('../node_modules/vcommons/xml/js-ObjTree');
// Globally available for conversion
var xotree = new UTIL.XML.ObjTree();
var dom = require('xmldom').DOMParser;

var feedTransformer = require('../lib/feedTransformer.js');

var NodeJms= require('nodejms');

var HashMap = require('hashmap').HashMap;
var jmsClients = new HashMap();
var notificationConfigMap = new HashMap();

for (var i = 0; i < config.notification.length; i++) {
	notificationConfigMap.set(config.notification[i].name, config.notification[i]);
	// Set JMS Client separately for convenient access
	var jmsClient = new NodeJms(__dirname + "/" + config.notification[i].endpoint.destination.jmsConnectLibrary, config.notification[i].endpoint.destination); 
	jmsClients.set(config.notification[i].name, jmsClient);
}
var client = redis.createClient(config.listener.redis.port || '6379', config.listener.redis.host || 'localhost');
// Do client.auth

function processErrorAndRollback(err, evt) {
	if(config.debug) {
		console.log(err);
	}
	// Something goes wrong - push event back to queue
	client.lpush(evt[0], evt[1]);
	// Listen again
	client.blpop(config.listener.channel, '0', callback);
}

function callback(err, evt){
	if(!_.isArray(evt)) {
		throw new Error("Event must have some value");
	}
	var channel = evt[0];
	var object = evt[1];
	
	if(err) {
		processErrorAndRollback(err, evt);
		return;
	}	
	if(object) {
		
		if(config.debug) {
			console.log("Evicted from Queue:" + channel + " Object: " + object);
		}
		
		var jsonObj = JSON.parse(object);
		var collection = jsonObj.ns;
		var record = jsonObj.o;
		
		// Check global subscriptions (subscribed to all changes in a collection)
		var globalSubscription = config.globalSubscriptions[collection];
		// Get SSN
		var ssn = jsonpath.eval(jsonObj.o, '$..nc:PersonSSNIdentification.nc:IdentificationID');
		// Check whether the SSN has a subscription
		// Query CRUD - http://localhost:3001/core/serviceTreatmentRecords.subscriptions?query={"subscription:Subscription.subscription:CommonData.nc:Person.nc:PersonSSNIdentification.nc:IdentificationID":"987654321"}
		
		request(config.ecrud.url + '/'
			 + collection + '.subscriptions?query={"subscription:Subscription.subscription:CommonData.nc:Person.nc:PersonSSNIdentification.nc:IdentificationID":"'
			 + ssn + '"}', function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var json = JSON.parse(body);
				json = json ? json : {};
				if (json.length > 0) {
					// Get the Subscriber ID
					for(var i=0; i<json.length; i++) {
						var subData = json[i];
						var subId = subData['subscription:Subscription']['subscription:CommonData']['vler:Subscription']['vler:Addressing']['vler:ReplyTo']['vler:SubscriberId'];
						var jsonSubId = JSON.parse('[{"name":"' + subId + '"}]');
						if(_.isUndefined(globalSubscription)) {
							globalSubscription = jsonSubId;
						} else {
							globalSubscription[globalSubscription.length] = jsonSubId; 
						}
					}
				}
				
				if (_.isUndefined(globalSubscription) || _.isEmpty(globalSubscription)) {
					// No configuration
					// Listen again
					client.blpop(config.listener.channel, '0', callback);
					return;
				}
				for (var i = 0; i < globalSubscription.length; i++) {
					var notificationConfigName = globalSubscription[i].name;
					var notificationConfig = notificationConfigMap.get(notificationConfigName);
					var toSend = JSON.stringify(jsonObj.o);
					if(S(notificationConfig.accept).startsWith("application/atom+xml")) {
						// TODO: Remove hardcoding
						var jsonFeed;
						if(collection == 'disabilityBenefitsQuestionnaires')
							jsonFeed = feedTransformer.niemDocToJsonFeed(toSend, "dbq", jsonObj.o._id, jsonObj.o.uploadDate);
						else if(collection =='serviceTreatmentRecords')
							jsonFeed = feedTransformer.niemDocToJsonFeed(toSend, "str", jsonObj.o._id, jsonObj.o.uploadDate);
						else if(collection =='electronicCaseFiles')
							jsonFeed = feedTransformer.niemDocToJsonFeed(toSend, "ecft", jsonObj.o._id, jsonObj.o.uploadDate);
						toSend = xotree.writeXML(jsonFeed);
					}
					if(S(notificationConfig.endpoint.type).startsWith('JMS')) {
						var jmsClient = jmsClients.get(notificationConfig.name);
						jmsClient.sendMessageAsync(toSend, "text", null, function (err) {
							if(err) {
								processErrorAndRollback(err, evt);
								return;
							}
							if(config.debug) {
								console.log('Sent Message to JMS Queue:' + notificationConfig.endpoint.destination.destinationJndiName + ' Message:' + toSend);
							}
							// Listen again
							client.blpop(config.listener.channel, '0', callback);
							return;
						});
					}
					
				}
			} else {
				processErrorAndRollback(err, evt);
				return;
			}
		});		
		
	}
}
// Start the process
client.blpop(config.listener.channel, '0', callback);

if(config.debug) {
	console.log('Listening on Redis Channel-' + (config.listener.redis.host || 'localhost') + ':' + (config.listener.redis.port || '6379'));
}

// Default exception handler
process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});
// Ctrl-C Shutdown
process.on( 'SIGINT', function() {
  console.log( "\nShutting down from  SIGINT (Crtl-C)" )
  process.exit( )
})
// Default exception handler
process.on('exit', function (err) {
	if(!_.isUndefined(client)) {
		// Cleanup
	}
	if(!_.isUndefined(jmsClients)) {
		jmsClients.forEach(function(jmsClient, key) {
			jmsClient.destroy();
		});
	}
});