var config = module.parent.exports.config;
var logger = module.parent.exports.logger;

var fs = require('fs');
var jsonpath = require('JSONPath');
var util = require('vcommons').util;
 // Initialize ObjTree library for XML/JSON Conversion
UTIL = {};
UTIL.XML = require('vcommons').objTree;
// Globally available for conversion
var xotree = new UTIL.XML.ObjTree();
// NOTE: FEED_GRIDFS_BASEHREF must have the format: "http://localhost:3002/core/fs/";
var FEED_GRIDFS_BASEHREF = config.transformer.options.feed.gridfsBasehref;
var FEED_TITLE = config.transformer.options.feed.title;
var FEED_VERSION = config.transformer.options.feed.version;

// NOTE: FEED_REDIRECT_HREF will have the format: "http://localhost:1234?redirectURL="
var FEED_REDIRECT_HREF = config.transformer.options.feed.redirectHref;


var GRIDFS_LABEL = config.transformer.options.feed.gridfsPrefix;		

// NOTE: loading into global space - to avoid asynch, efficiency problem if loading within createJsonFeed()
logger.trace('Loading file', config.transformer.options.feed.atomJsonTemplate);
oneEntryNLinksFeedTemplate = fs.readFileSync(config.transformer.options.feed.atomJsonTemplate);

logger.trace('oneEntryNLinksTemplate = '+oneEntryNLinksFeedTemplate);

exports.transform = function(data, options, callback) {
	logger.trace('Trying to convert to JSON Obj', data);
	try {
		var json = JSON.parse(data);
		console.log('test');
		logger.trace('Trying to convert JSON Obj to NIEM', json);
		var jsonFeed = niemDocJsObjToJsonFeed(json, json._id, json.uploadDate);
		logger.trace('Converted JSON Feed', jsonFeed);
		data = xotree.writeXML(jsonFeed);
		logger.trace('Converted XML Feed', data);
		callback(data);
	} catch (err) {
		logger.error('JSON could not be converted to feed', err);
		callback(null, err);
	}
}

function niemDocStrToJsonFeed(jsonDocContentStr, docIdStr, docUploadDateStr) {
	logger.trace('feedTransformer.niemDocStrToJsonFeed() running');
	//  do null, undefined, empty checks on input parameters, and throw err if so
	if (jsonDocContentStr == null || jsonDocContentStr.length === '') {
		throw new Error("feedTransformer.niemDocStrToJsonFeed(): jsonDocContentStr parameter is empty!");
	}

	// parse the JSON Text string into a JavaScript Object
	// Note: throws an err if this won't parse?
	var docContentJsObj = JSON.parse(jsonDocContentStr);	
	
	return niemDocJsObjToJsonFeed(docContentJsObj, docIdStr, docUploadDateStr);
}

function niemDocJsObjToJsonFeed(docContentJsObj, docIdStr, docUploadDateStr) {
	logger.trace('feedTransformer.niemDocJsObjToJsonFeed() running');
	//  do null, undefined, empty checks on input parameters, and throw err if so
	if (docContentJsObj == null || docContentJsObj.length === '') {
		throw new Error("feedTransformer.niemDocJsObjToJsonFeed(): docContentJsObj parameter is empty!");
	}
	if (docIdStr == null || docIdStr.length === '') {
		throw new Error("feedTransformer.niemDocJsObjToJsonFeed(): docIdStr parameter is empty!");
	}
	if (docUploadDateStr == null || docUploadDateStr.length === '') {
		throw new Error("feedTransformer.niemDocJsObjToJsonFeed(): docUploadDateStr parameter is empty!");
	}
		
	var docTitle, docVersion, docSubtitle, docAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, entryContentType;
	var entryLinksArr = [];

	// feed title
	docTitle = FEED_TITLE;
	
	// feed/LENS version #
	docVersion = FEED_VERSION;
	
	// feed author
	// TODO: Should this be the same as the docTitle?
	docAuthor = docTitle; 	
	
	// entry content-type
	entryContentType = "application/xml";	
	
	logger.trace('docTitle = ['+docTitle+']');
	logger.trace('docVersion = ['+docVersion+']');
	logger.trace('docIdStr = ['+docIdStr+']');
	logger.trace('docUploadDateStr = ['+docUploadDateStr+']');		
	logger.trace('docAuthor = ['+docAuthor+']');
	logger.trace('entryContentType = ['+entryContentType+']');
	
	// extract remaining feed and entry header info out of docContentJsObj, for any type of entry content		
	
	// feed subtitle
	//var docSubtitle = "Exam Result (DisabilityBenefitsQuestionnaire) Create Notification"; 
	// TODO: Is this correct? Should this be a LENS event description instead of nc:DocumentTitleText?		
	var docSubtitleArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentTitleText');
	if (docSubtitleArr.length > 0){
		docSubtitle = docSubtitleArr[0];
	}
	logger.trace('docSubtitle = ['+docSubtitle+']');
	// entry title		
	var entryTitleArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentDescriptionText');
	if (entryTitleArr.length > 0){
		entryTitle = entryTitleArr[0];
	}
	logger.trace('entryTitle = ['+entryTitle+']');
	// entry id		
	// TODO: Should this be a 3-part id? This is only one uniqueDocumentId now.		
	var documentIdentificationArrArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentIdentification');		
	if(documentIdentificationArrArr.length > 0) {			
		var documentIdentificationArr = documentIdentificationArrArr[0];			
		if (isArray(documentIdentificationArr) && documentIdentificationArr.length > 0) {	
			// have found multiple documentIdentification items	
			logger.trace('have multiple documentIdentification items');
			var entryDocumentIdentification;
			for (var i = 0; i < documentIdentificationArr.length; i++) {
			    // if nc:DocumentIdentification has no nc:IdentificationCategoryText or no nc:IdentificationCategoryDescriptionText, 
				//    then have the desired entry nc:DocumentIdentification element
				if (documentIdentificationArr[i]["nc:IdentificationCategoryText"] == null) {
					entryDocumentIdentification = documentIdentificationArr[i];
				}
			}
			entryId = entryDocumentIdentification['nc:IdentificationID'];
		} else {
			// have found only one documentIdentification item
			var entryDocumentIdentification = documentIdentificationArrArr[0];
			logger.trace('have one documentIdentification item');
			entryId = entryDocumentIdentification['nc:IdentificationID'];
		} 
	} else {
		// found no documentIdentification items
		// TODO: do something?
	}
	logger.trace('entryId = ['+entryId+']');
	
	// entry updated date
	var entryUpdatedDateArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentCreationDate.nc:DateTime');
	if (entryUpdatedDateArr.length > 0){
		entryUpdatedDate = entryUpdatedDateArr[0];
	}
	logger.trace('entryUpdatedDate = ['+entryUpdatedDate+']');
	
	// entry author
	var entryAuthorPerson;
	// using nc:Person s:id="two"		
	var entryPersonsArrArr = jsonpath.eval(docContentJsObj, '$..nc:Person');
	if (entryPersonsArrArr.length > 0) {			
		// get the inner result array of Person items
		var entryPersonsArr = entryPersonsArrArr[0];
		if (isArray(entryPersonsArr)) {
			for (var i = 0; i < entryPersonsArr.length; i++) {					
			    // if nc:Person -s:id == two, then have doc author element
				logger.trace('entryPersonsArr[i][\"-s:id\"]='+entryPersonsArr[i]["-s:id"]);
				if (entryPersonsArr[i]["-s:id"] == "two") {
					entryAuthorPerson = entryPersonsArr[i];					
				}
			}	
		} else {
			// have found only one nc:Person element
			var entryPerson = entryPersonsArrArr[0];
			logger.trace('entryPerson[\"-s:id\"]='+entryPerson["-s:id"]);
			if (entryPerson["-s:id"] == "two") {
				entryAuthorPerson = entryPersonsArr[i];					
			}
		}
		if (entryAuthorPerson) {				
			var entryAuthorFirstName = entryAuthorPerson['nc:PersonName']['nc:PersonGivenName'];
			logger.trace('entryAuthorFirstName = ['+entryAuthorFirstName+']');
			var entryAuthorMiddleInit = entryAuthorPerson['nc:PersonName']['nc:PersonMiddleName'];
			logger.trace('entryAuthorMiddleInit = ['+entryAuthorMiddleInit+']');
			var entryAuthorLastName = entryAuthorPerson['nc:PersonName']['nc:PersonSurName'];
			logger.trace('entryAuthorLastName = ['+entryAuthorLastName+']');
			entryAuthor = entryAuthorFirstName + ' ' + entryAuthorMiddleInit + ' ' + entryAuthorLastName; 
		}			
	}				
	if (entryPersonsArrArr.length == 0 || !entryAuthorPerson) {
		// either no nc:Person items where found, or no nc:Person with -s:id== two were found 
		logger.trace('entryAuthor was not yet found, attempt to find the Org name instead...');
		// ... so try to get entryAuthor from 'nc:DocumentSource.nc:EntityOrganization.nc:OrganizationName'
		var entryAuthorArr = jsonpath.eval(docContentJsObj, '$..nc:DocumentSource.nc:EntityOrganization.nc:OrganizationName');
		if (entryAuthorArr.length > 0) {
			entryAuthor = entryAuthorArr[0];
		} else {
			// no org name found
			// TODO: do something with no entryAuthor found?
			logger.trace('no entryAuthor was found!');
			entryAuthor = "Unknown";
		}
	}
	entryAuthor = util.trimStr(entryAuthor);	
	logger.trace('entryAuthor = ['+entryAuthor+']');
	
	// create the Subject Document link, if possible, and put into entryLinksArr array
	var gridfsId1RawStr = "";
	var gridfsId1RawArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentFileControlID');
	if (gridfsId1RawArr.length > 0) {
		gridfsId1RawStr = gridfsId1RawArr[0];	
		logger.trace("nc:Document.nc:DocumentFileControlID found: gridfsId1RawStr="+gridfsId1RawStr);
		// remove "gridfs://" if present 		
		var gridfsId1Str = gridfsId1RawStr.toString().replace(GRIDFS_LABEL,"");  			
		var link1HrefStr = FEED_GRIDFS_BASEHREF + gridfsId1Str;
		logger.trace('link1HrefStr = ['+link1HrefStr+']');
		
		// get matching content-type
		var link1ContentTypeStr;
		var link1ContentTypeArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentFormatText');
		if (link1ContentTypeArr.length > 0){
			link1ContentTypeStr = link1ContentTypeArr[0];
		} else {
			// TODO: Do something if link1ContentType not found?
			logger.trace('no Subject Document link content-type, nc:Document.nc:DocumentFormatText was found!');
		}
		logger.trace('link1ContentTypeStr = ['+link1ContentTypeStr+']');
		
		// create link object and put in entryLinksArr
		var newLinkJsObj = {				
			"title":"Subject Document",
			"type":link1ContentTypeStr,			
			"href":link1HrefStr			
		};
		entryLinksArr.push(newLinkJsObj);
	} else {
		// TODO: Do something if gridfsId1Raw not found, no Subject Document link?
		logger.trace("No Subject Document link, nc:Document.nc:DocumentFileControlID was found!");
	}		
			
	// find the attachments to get the links for them
	var attachmentsArrArr = jsonpath.eval(docContentJsObj, '$..nc:Attachment');
	if(attachmentsArrArr.length > 0) {			
		var attachmentsArr = attachmentsArrArr[0];			
		if(isArray(attachmentsArr) && attachmentsArr.length > 1) {
			logger.trace('multiple attachments found: n='+attachmentsArr.length);
			// use the attachments array
			for (var i = 0; i < (attachmentsArr.length); i++) {						
				var attachmentJsObj = attachmentsArr[0];	
				
				// create the Attachment link
				var linkGridfsIdRawStr = attachmentJsObj['nc:BinaryLocationURI'];
				logger.trace("linkGridfsIdRawStr="+linkGridfsIdRawStr);	
				// remove "gridfs://" if present 		
				var linkGridfsIdStr = linkGridfsIdRawStr.toString().replace(GRIDFS_LABEL,"");  		
				var linkHrefStr = FEED_GRIDFS_BASEHREF + linkGridfsIdStr;
				logger.trace('attachment linkHrefStr = ['+linkHrefStr+']');
				
				// get matching content-type
				var linkTypeStr = attachmentJsObj['nc:BinaryFormatStandardName'];
				logger.trace('attachment linkTypeStr = ['+linkTypeStr+']');
				
				// create link object and put in entryLinksArr
				var linkJsObj =  {
						"title":"Attachment",
						"type":linkTypeStr,			
						"href":linkHrefStr
					};					
				entryLinksArr.push(linkJsObj);
			}
		} else {							
			var attachmentJsObj = attachmentsArrArr[0];
			logger.trace('one attachment found');
			
			// create the Attachment link
			var linkGridfsIdRawStr = attachmentJsObj['nc:BinaryLocationURI'];
			logger.trace("linkGridfsIdRawStr="+linkGridfsIdRawStr);
			// remove "gridfs://" if present 		
			var linkGridfsIdStr = linkGridfsIdRawStr.toString().replace(GRIDFS_LABEL,"");  		
			var linkHrefStr = FEED_GRIDFS_BASEHREF + linkGridfsIdStr;
			logger.trace('attachment linkHrefStr = ['+linkHrefStr+']');
			
			// get matching content-type
			var linkTypeStr = attachmentJsObj['nc:BinaryFormatStandardName'];
			logger.trace('attachment linkTypeStr = ['+linkTypeStr+']');
			
			// create link object and put in entryLinksArr
			var linkJsObj =  {
					"title":"Attachment",
					"type":linkTypeStr,			
					"href":linkHrefStr
				};				
			entryLinksArr.push(linkJsObj);
		}
	} else {
		// TODO: throw error if no attachments found?
		logger.trace("No attachments found!");
	}
	logger.trace('total entryLinksArr.length = '+entryLinksArr.length);

	// create JSON Feed using the extracted data and docContentJsObj
	
	var jsonFeedJsObject = createJsonFeed(docTitle, docVersion, docSubtitle, docIdStr, docUploadDateStr, docAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, docContentJsObj, entryContentType, entryLinksArr);	
	return jsonFeedJsObject;	
}

function createJsonFeed(docTitle, docVersion, docSubtitle, docId, docUpdatedDate, docAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, entryContentBodyJsObject, entryContentType, entryLinksArr) {
	logger.trace('feedTransformer.createJsonFeed() running');
	
	// make a copy of the global template variable so the copy can be edited and used locally
	var jsonFeedTemplateStr = oneEntryNLinksFeedTemplate; 
	
	// parse the Json Feed Template string into an Javascript Object to update the feed
	// this throws an error if this won't parse
	var jsonFeedJsObject = JSON.parse(jsonFeedTemplateStr);
	
	// update feed schemae?
	// update JSON Feed object to have parameter content
	jsonFeedJsObject.feed.title["#text"] = docTitle + " ver. "+docVersion;
	jsonFeedJsObject.feed.subtitle["#text"] = docSubtitle;
	jsonFeedJsObject.feed.id = docId;
	jsonFeedJsObject.feed.updated = docUpdatedDate;
	jsonFeedJsObject.feed.generator["-version"] = docVersion;
	jsonFeedJsObject.feed.generator["#text"] = docTitle;
	jsonFeedJsObject.feed.author = docAuthor;
	
	jsonFeedJsObject.feed.entry.title = entryTitle;
	jsonFeedJsObject.feed.entry.id = entryId;
	jsonFeedJsObject.feed.entry.published = entryUpdatedDate;
	jsonFeedJsObject.feed.entry.updated = entryUpdatedDate;
	jsonFeedJsObject.feed.entry.author.name = entryAuthor;
	
	// add this entry content body as a Javascript Object here so it can be properly 
	// 		added as a JSON child element, not as a string 
	logger.trace('Feed Content: ', entryContentBodyJsObject);
	jsonFeedJsObject.feed.entry.content = entryContentBodyJsObject;
	
	// set entry's content type 
	jsonFeedJsObject.feed.entry.content["-type"] = entryContentType;
	
	// set links
	if (entryLinksArr.length > 0) {		
		if(1 == entryLinksArr.length) {
			// set JSON Feed object to one link, i.e. no JSON array
			var curLinkJsObj = entryLinksArr[0];
			jsonFeedJsObject.feed.entry.link["-title"] = curLinkJsObj.title;
			jsonFeedJsObject.feed.entry.link["-href"] = FEED_REDIRECT_HREF+curLinkJsObj.href;
			jsonFeedJsObject.feed.entry.link["-type"] = curLinkJsObj.type;
		} else {
			// set JSON Feed object to have multiple links, i.e. use array 
			var multipleLinksJsObj = {link: []};			
			for (var i = 0; i < entryLinksArr.length; i++) {			    
			    var curEntryLinkJsObj = entryLinksArr[i];
			    multipleLinksJsObj.link.push({
			          "-title": curEntryLinkJsObj.title,
			          "-rel": "enclosure",
			          "-href": FEED_REDIRECT_HREF+curEntryLinkJsObj.href,
			          "-type": curEntryLinkJsObj.type,
			          "-length": "1000000",
			          "-hreflang": "en"
			    });
			}
			jsonFeedJsObject.feed.entry.link = multipleLinksJsObj.link;
		}		
	} 
	// Can have items without links
	//else {
	//	return new Error("Can't have an empty entryLinksArr without any links! No entry links assigned.");
	//}	
	logger.trace('outputting jsonFeedJsObject='+JSON.stringify(jsonFeedJsObject));
	return jsonFeedJsObject;	
}

function isArray(item) {
    return Object.prototype.toString.call(item) === '[object Array]';
}