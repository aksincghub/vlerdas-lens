/**
 * Filter by subscription and track subscription
 *
 * Created by: Julian Jewel
 *
 */
var config = module.parent.exports.config;
var logger = module.parent.exports.logger;

var _ = require('underscore');
var S = require('string');
var jsonpath = require('JSONPath');
var request = require('request');
var retry = require('retry');

exports.transform = function (data, options, callback) {
    logger.trace('Trying to convert to JSON Obj', data);
    var evtObj = JSON.parse(data);
    try {
        if (_.isUndefined(options.filter)) {
            logger.trace('No Filters Found');
            return callback();
        }
        logger.trace('Found local filter configuration ' + options.filter);

        logger.trace('Evaluating data to expression ' + options.filter.parameterExpression);
        // Evaluate Expression
        var value = jsonpath.eval(evtObj, options.filter.parameterExpression);
        logger.trace('Evaluated value ' + value);

        if (_.isUndefined(value)) {
            return callback(data, new Error('Invalid Value ' + value + ' in message for expression ' + options.filter.expression));
        } else {
            value = S(value).trim().s;
            logger.trace('Trimmed value ' + value);
        }
        // Ex. Check whether the SSN has a subscription
        // Query CRUD - http://localhost:3001/core/serviceTreatmentRecords.subscriptions?query={"subscription:Subscription.subscription:CommonData.nc:Person.nc:PersonSSNIdentification.nc:IdentificationID":"987654321"}
        logger.trace('Making query ', options.filter.collectionUrl, options.filter.queryParameters);
        var queryUrl = options.filter.collectionUrl + options.filter.queryParameters.replace(':1', value);
        logger.trace('Query URL: ' + queryUrl);
        var operation = retry.operation(queryUrl);
        // Ex. Get subscriptions by SSN
        operation.attempt(function (currentAttempt) {
            logger.info('Attempt ' + currentAttempt + ':' + queryUrl);
            request(queryUrl, function (error, response, body) {
                // Attempt retry
                if (operation.retry(error)) {
                    logger.error('Retry failed with error:', error, 'Attempt:', currentAttempt);
                    return;
                }

                if (!error && response.statusCode == 200) {
                    var json = JSON.parse(body);
                    json = json ? json : {};
                    logger.trace('CRUD returned records: ', json);

                    if (json.length <= 0) {
                        logger.trace('No Records:', error, 'Attempt:', currentAttempt);
                        return callback();
                    } else {
                        return callback(data);
                    }
                } else {
                    logger.error('Error occured during quering CRUD, possible elements in processing queue ', error);
                    return callback(data, error);
                }
            });
        });
    } catch (err) {
        logger.error('Could not filter!', err);
        callback(null, err);
    }
}