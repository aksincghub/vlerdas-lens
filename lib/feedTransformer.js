var fs = require('fs');
var jsonpath = require('JSONPath');
var config = module.parent.exports.config;
var util = require('../node_modules/vcommons/util/util.js');
 
// NOTE: FEED_GRIDFS_BASEHREF must have the format: "http://localhost:3002/core/fs/";
var FEED_GRIDFS_BASEHREF = config.feed.gridfsBasehref;
var FEED_TITLE = config.feed.title;
var FEED_VERSION = config.feed.version;

var GRIDFS_LABEL = "gridfs://";		

// NOTE: loading into global space - to avoid asynch, efficiency problem if loading within createJsonFeed()
oneEntryNLinksFeedTemplate = fs.readFileSync("./lib/notificationAtomFeedOneEntryOneLink_template.json");

if(config.debug) {
	console.log('oneEntryNLinksTemplate = '+oneEntryNLinksFeedTemplate);
}	

exports.niemDocStrToJsonFeed = function(jsonDocContentStr, docIdStr, docUploadDateStr) {
	if(config.debug) {
		console.log('feedTransformer.niemDocStrToJsonFeed() running');
	}
	//  do null, undefined, empty checks on input parameters, and throw err if so
	if (jsonDocContentStr == null || jsonDocContentStr.length === '') {
		return new Error("feedTransformer.niemDocStrToJsonFeed(): jsonDocContentStr parameter is empty!");
	}

	// parse the JSON Text string into a JavaScript Object
	// Note: throws an err if this won't parse?
	var docContentJsObj = JSON.parse(jsonDocContentStr);	
	
	return this.niemDocJsObjToJsonFeed(docContentJsObj, docIdStr, docUploadDateStr);
}

exports.niemDocJsObjToJsonFeed = function(docContentJsObj, docIdStr, docUploadDateStr) {
	if(config.debug) {
		console.log('feedTransformer.niemDocJsObjToJsonFeed() running');
	}	
	//  do null, undefined, empty checks on input parameters, and throw err if so
	if (docContentJsObj == null || docContentJsObj.length === '') {
		return new Error("feedTransformer.niemDocJsObjToJsonFeed(): docContentJsObj parameter is empty!");
	}
//	if (docContentDescStr == null || docContentDescStr.length === '') {
//		return new Error("feedTransformer.niemDocJsObjToJsonFeed(): docContentDescStr parameter is empty!");
//	}
	if (docIdStr == null || docIdStr.length === '') {
		return new Error("feedTransformer.niemDocJsObjToJsonFeed(): docIdStr parameter is empty!");
	}
	if (docUploadDateStr == null || docUploadDateStr.length === '') {
		return new Error("feedTransformer.niemDocJsObjToJsonFeed(): docUploadDateStr parameter is empty!");
	}
		
	var docTitle, docVersion, docSubtitle, docAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, entryContentBodyJsObject, entryContentType;
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
	
	if(config.debug) {
		console.log('docTitle = ['+docTitle+']');
		console.log('docVersion = ['+docVersion+']');
		console.log('docIdStr = ['+docIdStr+']');
		console.log('docUploadDateStr = ['+docUploadDateStr+']');		
		console.log('docAuthor = ['+docAuthor+']');
		console.log('entryContentType = ['+entryContentType+']');
	}
	
	// extract remaining feed and entry header info out of docContentJsObj, for any type of entry content		
	
	// feed subtitle
	//var docSubtitle = "Exam Result (DisabilityBenefitsQuestionnaire) Create Notification"; 
	// TODO: Is this correct? Should this be a LENS event description instead of nc:DocumentTitleText?		
	var docSubtitleArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentTitleText');
	if (docSubtitleArr.length > 0){
		docSubtitle = docSubtitleArr[0];
	}
	if(config.debug) {
		console.log('docSubtitle = ['+docSubtitle+']');
	}
	// entry title		
	var entryTitleArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentDescriptionText');
	if (entryTitleArr.length > 0){
		entryTitle = entryTitleArr[0];
	}
	if(config.debug) {
		console.log('entryTitle = ['+entryTitle+']');
	}
	// entry id		
	// TODO: Should this be a 3-part id? This is only one uniqueDocumentId now.		
	var documentIdentificationArrArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentIdentification');		
	if(documentIdentificationArrArr.length > 0) {			
		var documentIdentificationArr = documentIdentificationArrArr[0];			
		if (isArray(documentIdentificationArr) && documentIdentificationArr.length > 0) {	
			// have found multiple documentIdentification items	
			if(config.debug) {
				console.log('have multiple documentIdentification items');
			}
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
			if(config.debug) {
				console.log('have one documentIdentification item');
			}
			entryId = entryDocumentIdentification['nc:IdentificationID'];
		} 
	} else {
		// found no documentIdentification items
		// TODO: do something?
	}
	if(config.debug) {
		console.log('entryId = ['+entryId+']');
	}
	
	// entry updated date
	var entryUpdatedDateArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentCreationDate.nc:DateTime');
	if (entryUpdatedDateArr.length > 0){
		entryUpdatedDate = entryUpdatedDateArr[0];
	}
	if(config.debug) {
		console.log('entryUpdatedDate = ['+entryUpdatedDate+']');
	}
	
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
				if(config.debug) {
					console.log('entryPersonsArr[i][\"-s:id\"]='+entryPersonsArr[i]["-s:id"]);
				}
				if (entryPersonsArr[i]["-s:id"] == "two") {
					entryAuthorPerson = entryPersonsArr[i];					
				}
			}	
		} else {
			// have found only one nc:Person element
			var entryPerson = entryPersonsArrArr[0];
			if(config.debug) {
				console.log('entryPerson[\"-s:id\"]='+entryPerson["-s:id"]);
			}
			if (entryPerson["-s:id"] == "two") {
				entryAuthorPerson = entryPersonsArr[i];					
			}
		}
		if (entryAuthorPerson) {				
			var entryAuthorFirstName = entryAuthorPerson['nc:PersonName']['nc:PersonGivenName'];
			if(config.debug) {
				console.log('entryAuthorFirstName = ['+entryAuthorFirstName+']');
			}
			var entryAuthorMiddleInit = entryAuthorPerson['nc:PersonName']['nc:PersonMiddleName'];
			if(config.debug) {
				console.log('entryAuthorMiddleInit = ['+entryAuthorMiddleInit+']');
			}
			var entryAuthorLastName = entryAuthorPerson['nc:PersonName']['nc:PersonSurName'];
			if(config.debug) {
				console.log('entryAuthorLastName = ['+entryAuthorLastName+']');
			}
			entryAuthor = entryAuthorFirstName + ' ' + entryAuthorMiddleInit + ' ' + entryAuthorLastName; 
		}			
	}				
	if (entryPersonsArrArr.length == 0 || !entryAuthorPerson) {
		// either no nc:Person items where found, or no nc:Person with -s:id== two were found 
		if(config.debug) {
			console.log('entryAuthor was not yet found, attempt to find the Org name instead...');
		}
		// ... so try to get entryAuthor from 'nc:DocumentSource.nc:EntityOrganization.nc:OrganizationName'
		var entryAuthorArr = jsonpath.eval(docContentJsObj, '$..nc:DocumentSource.nc:EntityOrganization.nc:OrganizationName');
		if (entryAuthorArr.length > 0) {
			entryAuthor = entryAuthorArr[0];
		} else {
			// no org name found
			// TODO: do something with no entryAuthor found?
			if(config.debug) {
				console.log('no entryAuthor was found!');
			}
			entryAuthor = "Unknown";
		}
	}
	entryAuthor = util.trimStr(entryAuthor);	
	if(config.debug) {
		console.log('entryAuthor = ['+entryAuthor+']');
	}
	
	// create the Subject Document link, if possible, and put into entryLinksArr array
	var gridfsId1RawStr = "";
	var gridfsId1RawArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentFileControlID');
	if (gridfsId1RawArr.length > 0) {
		gridfsId1RawStr = gridfsId1RawArr[0];	
		if(config.debug) {
			console.log("nc:Document.nc:DocumentFileControlID found: gridfsId1RawStr="+gridfsId1RawStr);
		}
		// remove "gridfs://" if present 		
		var gridfsId1Str = gridfsId1RawStr.toString().replace(GRIDFS_LABEL,"");  			
		var link1HrefStr = FEED_GRIDFS_BASEHREF + gridfsId1Str;
		if(config.debug) {
			console.log('link1HrefStr = ['+link1HrefStr+']');
		}
		
		// get matching content-type
		var link1ContentTypeStr;
		var link1ContentTypeArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentFormatText');
		if (link1ContentTypeArr.length > 0){
			link1ContentTypeStr = link1ContentTypeArr[0];
		} else {
			// TODO: Do something if link1ContentType not found?
			if(config.debug) {
				console.log('no Subject Document link content-type, nc:Document.nc:DocumentFormatText was found!');
			}
		}
		if(config.debug) {
			console.log('link1ContentTypeStr = ['+link1ContentTypeStr+']');
		}
		
		// create link object and put in entryLinksArr
		var newLinkJsObj = {				
			"title":"Subject Document",
			"type":link1ContentTypeStr,			
			"href":link1HrefStr			
		};
		entryLinksArr.push(newLinkJsObj);
	} else {
		// TODO: Do something if gridfsId1Raw not found, no Subject Document link?
		if(config.debug) {
			console.log("No Subject Document link, nc:Document.nc:DocumentFileControlID was found!");
		}
	}		
			
	// find the attachments to get the links for them
	var attachmentsArrArr = jsonpath.eval(docContentJsObj, '$..nc:Attachment');
	if(attachmentsArrArr.length > 0) {			
		var attachmentsArr = attachmentsArrArr[0];			
		if(isArray(attachmentsArr) && attachmentsArr.length > 1) {
			if(config.debug) {
				console.log('multiple attachments found: n='+attachmentsArr.length);
			}			
			// use the attachments array
			for (var i = 0; i < (attachmentsArr.length); i++) {						
				var attachmentJsObj = attachmentsArr[0];	
				
				// create the Attachment link
				var linkGridfsIdRawStr = attachmentJsObj['nc:BinaryLocationURI'];
				if(config.debug) {
					console.log("linkGridfsIdRawStr="+linkGridfsIdRawStr);	
				}
				// remove "gridfs://" if present 		
				var linkGridfsIdStr = linkGridfsIdRawStr.toString().replace(GRIDFS_LABEL,"");  		
				var linkHrefStr = FEED_GRIDFS_BASEHREF + linkGridfsIdStr;
				if(config.debug) {
					console.log('attachment linkHrefStr = ['+linkHrefStr+']');
				}
				
				// get matching content-type
				var linkTypeStr = attachmentJsObj['nc:BinaryFormatStandardName'];
				if(config.debug) {
					console.log('attachment linkTypeStr = ['+linkTypeStr+']');
				}
				
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
			if(config.debug) {
				console.log('one attachment found');
			}
			
			// create the Attachment link
			var linkGridfsIdRawStr = attachmentJsObj['nc:BinaryLocationURI'];
			if(config.debug) {
				console.log("linkGridfsIdRawStr="+linkGridfsIdRawStr);
			}
			// remove "gridfs://" if present 		
			var linkGridfsIdStr = linkGridfsIdRawStr.toString().replace(GRIDFS_LABEL,"");  		
			var linkHrefStr = FEED_GRIDFS_BASEHREF + linkGridfsIdStr;
			if(config.debug) {
				console.log('attachment linkHrefStr = ['+linkHrefStr+']');
			}
			
			// get matching content-type
			var linkTypeStr = attachmentJsObj['nc:BinaryFormatStandardName'];
			if(config.debug) {
				console.log('attachment linkTypeStr = ['+linkTypeStr+']');
			}
			
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
		if(config.debug) {
			console.log("No attachments found!");
		}
	}
	if(config.debug) {
		console.log('total entryLinksArr.length = '+entryLinksArr.length);
	}

	// create JSON Feed using the extracted data and docContentJsObj
	var jsonFeedJsObject = this.createJsonFeed(docTitle, docVersion, docSubtitle, docIdStr, docUploadDateStr, docAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, docContentJsObj, entryContentType, entryLinksArr);	
	return jsonFeedJsObject;	
}

exports.createJsonFeed = function(docTitle, docVersion, docSubtitle, docId, docUpdatedDate, docAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, entryContentBodyJsObject, entryContentType, entryLinksArr) {
	if(config.debug) {
		console.log('feedTransformer.createJsonFeed() running');
	}
	
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
	jsonFeedJsObject.feed.entry.content = entryContentBodyJsObject;
	
	// set entry's content type 
	jsonFeedJsObject.feed.entry.content["-type"] = entryContentType;
	
	// set links
	if (entryLinksArr.length > 0) {		
		if(1 == entryLinksArr.length) {
			// set JSON Feed object to one link, i.e. no JSON array
			var curLinkJsObj = entryLinksArr[0];
			jsonFeedJsObject.feed.entry.link["-title"] = curLinkJsObj.title;
			jsonFeedJsObject.feed.entry.link["-href"] = curLinkJsObj.href;
			jsonFeedJsObject.feed.entry.link["-type"] = curLinkJsObj.type;
		} else {
			// set JSON Feed object to have multiple links, i.e. use array 
			var multipleLinksJsObj = {link: []};			
			for (var i = 0; i < entryLinksArr.length; i++) {			    
			    var curEntryLinkJsObj = entryLinksArr[i];
			    multipleLinksJsObj.link.push({
			          "-title": curEntryLinkJsObj.title,
			          "-rel": "enclosure",
			          "-href": curEntryLinkJsObj.href,
			          "-type": curEntryLinkJsObj.type,
			          "-length": "1000000",
			          "-hreflang": "en"
			    });
			}
			jsonFeedJsObject.feed.entry.link = multipleLinksJsObj.link;
		}		
	} else {
		return new Error("Can't have an empty entryLinksArr without any links! No entry links assigned.");
	}	
	if(config.debug) {
		console.log('outputting jsonFeedJsObject='+JSON.stringify(jsonFeedJsObject));
	}
	return jsonFeedJsObject;	
}

function isArray(item) {
    return Object.prototype.toString.call(item) === '[object Array]';
}
