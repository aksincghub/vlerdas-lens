var config = module.parent.exports.config;
var logger = module.parent.exports.logger;
var fs = require('fs');
var jsonpath = require('JSONPath');
var util = require('vcommons').util;
 
UTIL = {};
UTIL.XML = require('vcommons').objTree;
// Globally available for conversion
var xotree = new UTIL.XML.ObjTree();

// NOTE: FEED_GRIDFS_BASEHREF must have the format: "http://localhost:3002/core/fs/";
var FEED_GRIDFS_BASEHREF = config.transformer.options.feed.gridfsBasehref;
var FEED_DBQCOLLECTIONNAME = config.transformer.options.feed.dbqCollectionName;
var FEED_TITLE = config.transformer.options.feed.title;
var FEED_VERSION = config.transformer.options.feed.version;
// NOTE: FEED_REDIRECT_HREF will have the format: "http://localhost:1234?redirectURL="
var FEED_REDIRECT_HREF = config.transformer.options.feed.redirectHref;

// NOTE: FEED_REDIRECT_HREF will have the format: "http://localhost:1234?redirectURL="
var FEED_REDIRECT_HREF = config.transformer.options.feed.redirectHref;


var GRIDFS_LABEL = config.transformer.options.feed.gridfsPrefix;		

// NOTE: loading into global space - to avoid asynch, efficiency problem if loading within createJsonFeed()
logger.trace('Loading file', config.transformer.options.feed.dbqNotificationJsonTemplate);
dbqNotificationFeedTemplate = fs.readFileSync(config.transformer.options.feed.dbqNotificationJsonTemplate);
//logger.trace('oneEntryNLinksTemplate = '+dbqNotificationFeedTemplate);

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

function niemDocStrToJsonFeed(jsonDocContentStr, dbDocUniqueIdStr, dbDocUploadDateStr) {
	logger.trace('previewFeedTransformer.niemDocStrToJsonFeed() running');
	//  do null, undefined, empty checks on input parameters, and throw err if so
	if (jsonDocContentStr == null || jsonDocContentStr.length === '') {
		return new Error("feedTransformer.niemDocStrToJsonFeed(): jsonDocContentStr parameter is empty!");
	}

	// parse the JSON Text string into a JavaScript Object
	// Note: throws an err if this won't parse?
	var docContentJsObj = JSON.parse(jsonDocContentStr);	
	
	return niemDocJsObjToJsonFeed(docContentJsObj, dbDocUniqueIdStr, dbDocUploadDateStr);
}

function niemDocJsObjToJsonFeed(docContentJsObj, dbDocUniqueIdStr, dbDocUploadDateStr) {
	logger.trace('previewFeedTransformer.niemDocJsObjToJsonFeed() running');
	//  do null, undefined, empty checks on input parameters, and throw err if so
	if (docContentJsObj == null || docContentJsObj.length === '') {
		throw new Error("feedTransformer.niemDocJsObjToJsonFeed(): docContentJsObj parameter is empty!");
	}
	if (dbDocUniqueIdStr == null || dbDocUniqueIdStr.length === '') {
		throw new Error("feedTransformer.niemDocJsObjToJsonFeed(): dbDocUniqueIdStr parameter is empty!");
	}
	if (dbDocUploadDateStr == null || dbDocUploadDateStr.length === '') {
		throw new Error("feedTransformer.niemDocJsObjToJsonFeed(): dbDocUploadDateStr parameter is empty!");
	}
		
	// gather information for the 'DBQ'/'cpExams' type of notification: the feed header items, the entry header items, 
	// and entry content which includes the cpExams-type of pr:Preview data:	
	
	var feedTitle, feedVersion, feedSubtitle, feedAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, entryContentType;
	var entryLinksArr = [];	
	
	// handle setting the constant data: 

	// feed title
	feedTitle = FEED_TITLE;
	
	// feed/LENS version #
	feedVersion = FEED_VERSION;
	
	// feed author
	// TODO: Should this be the same as the feedTitle?
	feedAuthor = feedTitle; 	
	
	// entry content-type
	entryContentType = "application/xml";	
	
	logger.trace('feedTitle = ['+feedTitle+']');
	logger.trace('feedVersion = ['+feedVersion+']');
	logger.trace('dbDocUniqueIdStr = ['+dbDocUniqueIdStr+']');
	logger.trace('dbDocUploadDateStr = ['+dbDocUploadDateStr+']');		
	logger.trace('feedAuthor = ['+feedAuthor+']');
	logger.trace('entryContentType = ['+entryContentType+']');
	
	// extract remaining feed and entry header info out of docContentJsObj:
	
	// handle the nc:Document data:
	
	// feed subtitle
	//var feedSubtitle = "Exam Result (DisabilityBenefitsQuestionnaire) Create Notification"; 
	// TODO: Is this correct? Should this be a LENS event description instead of nc:DocumentTitleText?		
	var feedSubtitleArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentTitleText');
	if (feedSubtitleArr.length > 0){
		feedSubtitle = feedSubtitleArr[0];
	}
	logger.trace('feedSubtitle = ['+feedSubtitle+']');
	// entry title		
	var entryTitleArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentDescriptionText');
	if (entryTitleArr.length > 0){
		entryTitle = entryTitleArr[0];
	}
	logger.trace('entryTitle = ['+entryTitle+']');
	// - document description text
	var docDescrText = entryTitle;
	// - document title text
	var docTitleText = entryTitle;
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
	var docId = entryId;
	
	// doc status text
	// "nc:Document.nc:DocumentStatus.nc:StatusText"
	var docStatus = "";
	var docStatusArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentStatus.nc:StatusText');
	if (docStatusArr.length > 0){
		docStatus = docStatusArr[0];
	}
	logger.trace('docStatus = ['+docStatus+']');	
	
	// entry updated date
	var entryUpdatedDateArr = jsonpath.eval(docContentJsObj, '$..nc:Document.nc:DocumentCreationDate.nc:DateTime');
	if (entryUpdatedDateArr.length > 0){
		entryUpdatedDate = entryUpdatedDateArr[0];
	}
	logger.trace('entryUpdatedDate = ['+entryUpdatedDate+']');
	// - document creation date
	var docCreationDate = entryUpdatedDate;	
	
	// handle the vler:Client data:
	
	// - for nc:Client, with "-s:id" = "client": the client id
	var clientId = "";
	// - for nc:Client, with "-s:id" = "client": vler:AssigningAuthority
	var clientAA = "";	
	// get entry Client with s:id="client"
	var entryClientClient;
	// get all vler:Client's in entry 		
	var entryClientsArrArr = jsonpath.eval(docContentJsObj, '$..vler:Client');
	if (entryClientsArrArr.length > 0) {			
		// get the inner result array of vler:Client items
		var entryClientsArr = entryClientsArrArr[0];
		if (isArray(entryClientsArr)) {
			for (var i = 0; i < entryClientsArr.length; i++) {					
			    // if nc:Person -s:id == two, then have doc author element
				logger.trace('entryClientsArr[i][\"-s:id\"]='+entryClientsArr[i]["-s:id"]);
				if (entryClientsArr[i]["-s:id"] == "client") {
					entryClientClient = entryClientsArr[i];					
				}
			}	
		} else {
			// have found only one vler:Client element
			var entryClient = entryClientsArrArr[0];
			logger.trace('entryClient[\"-s:id\"]='+entryClient["-s:id"]);
			if (entryClient["-s:id"] == "client") {
				entryClientClient = entryClient;					
			}
		}
		if (entryClientClient) {				
			clientId = entryClientClient['vler:ClientIdentifier']['nc:IdentificationID'];			
			clientAA = entryClientClient['vler:ClientIdentifier']['vler:AssigningAuthority'];			
		}			
	}	
	logger.trace('clientId = ['+clientId+']');
	logger.trace('clientAA = ['+clientAA+']');
	
	// handle the vler:ServiceProvider data:
	
	// - service provider id
	// from vler:ServiceProvider.vler:PersonIdentifier.nc:IdentificationID
	var serviceProviderId = "";
	// - service provider IdentificationJurisdictionText
	// from vler:ServiceProvider.vler:PersonIdentifier.nc:IdentificationJurisdictionText
	var serviceProviderJurisdText = "";
	// - service provider vler:ServiceProviderRoleTitle
	// from vler:ServiceProvider.vler:ServiceProviderRoleTitle	
	var serviceProviderRoleTitle = "";
	var serviceProviderArr = jsonpath.eval(docContentJsObj, '$..vler:ServiceProvider');
	if (serviceProviderArr.length > 0){
		var serviceProvider = serviceProviderArr[0];
		serviceProviderId = serviceProvider['vler:PersonIdentifier']['nc:IdentificationID'];
		serviceProviderJurisdText = serviceProvider['vler:PersonIdentifier']['nc:IdentificationJurisdictionText'];
		serviceProviderRoleTitle = serviceProvider['vler:ServiceProviderRoleTitle']; 
	}	
	logger.trace('serviceProviderId = ['+serviceProviderId+']');
	logger.trace('serviceProviderJurisdText = ['+serviceProviderJurisdText+']');
	logger.trace('serviceProviderRoleTitle = ['+serviceProviderRoleTitle+']');	
	
	// handle the nc:Person data:
	
	// entry author
	var entryAuthor;
	// person 'two' name
	var personTwoFirstName = "";
	var personTwoMiddleInit = "";
	var personTwoLastName = "";
	// person 'one' name
	var personOneFirstName = "";
	var personOneMiddleInit = "";
	var personOneLastName = "";
	// person 'one' nc:PersonBirthDate.nc:Date
	var personOneBirthdate = "";
	// person 'one' nc:PersonSexCode
	var personOneSex = "";
	// person 'one' nc:PersonSSNIdentification
	var personOneSSN = "";
	
	// for nc:Person -s:id == two, then have doc author element, and pr:Preview nc:Person 'two' values
	var personTwoJsObj;
	// for nc:Person -s:id == one, then have pr:Preview nc:Person 'one' values 
	var personOneJsObj;
	var entryPersonsArrArr = jsonpath.eval(docContentJsObj, '$..nc:Person');
	if (entryPersonsArrArr.length > 0) {			
		// get the inner result array of Person items
		var entryPersonsArr = entryPersonsArrArr[0];
		if (isArray(entryPersonsArr)) {
			// have multiple nc:Person elements
			for (var i = 0; i < entryPersonsArr.length; i++) {				    
				logger.trace('entryPersonsArr[i][\"-s:id\"]='+entryPersonsArr[i]["-s:id"]);
				if (entryPersonsArr[i]["-s:id"] == "two") {
					personTwoJsObj = entryPersonsArr[i];					
				}				
				if (entryPersonsArr[i]["-s:id"] == "one") {
					personOneJsObj = entryPersonsArr[i];					
				}
			}	
		} else {
			// have found only one nc:Person element
			var entryPerson = entryPersonsArrArr[0];
			logger.trace('entryPerson[\"-s:id\"]='+entryPerson["-s:id"]);
			if (entryPerson["-s:id"] == "two") {
				personTwoJsObj = entryPersonsArr[i];					
			}
			if (entryPersonsArr[i]["-s:id"] == "one") {
				personOneJsObj = entryPersonsArr[i];					
			}
		}
		// if nc:Person 'two' exists
		if (personTwoJsObj) {		
			// set individual Person 'two' values
			personTwoFirstName = personTwoJsObj['nc:PersonName']['nc:PersonGivenName'];
			if(!personTwoFirstName) {
				personTwoFirstName = "";
			}
			logger.trace('personTwoFirstName = ['+personTwoFirstName+']');
			personTwoMiddleInit = personTwoJsObj['nc:PersonName']['nc:PersonMiddleName'];
			if(!personTwoMiddleInit) {
				personTwoMiddleInit = "";
			}
			logger.trace('personTwoMiddleInit = ['+personTwoMiddleInit+']');
			personTwoLastName = personTwoJsObj['nc:PersonName']['nc:PersonSurName'];
			logger.trace('personTwoLastName = ['+personTwoLastName+']');
			// set the entry author value
			entryAuthor = personTwoFirstName + ' ' + personTwoMiddleInit + ' ' + personTwoLastName; 
		}	
		// if nc:Person 'one' exists
		if (personOneJsObj) {		
			// set individual Person 'one' values
			personOneFirstName = personOneJsObj['nc:PersonName']['nc:PersonGivenName'];
			if(!personOneFirstName) {
				personOneFirstName = "";
			}
			logger.trace('personOneFirstName = ['+personOneFirstName+']');
			personOneMiddleInit = personOneJsObj['nc:PersonName']['nc:PersonMiddleName'];
			if(!personOneMiddleInit) {
				personOneMiddleInit = "";
			}
			logger.trace('personOneMiddleInit = ['+personOneMiddleInit+']');
			personOneLastName = personOneJsObj['nc:PersonName']['nc:PersonSurName'];
			logger.trace('personOneLastName = ['+personOneLastName+']');
			// set birthdate
			personOneBirthdate = personOneJsObj['nc:PersonBirthDate']['nc:Date'];
			logger.trace('personOneBirthdate = ['+personOneBirthdate+']');
			// set sex
			personOneSex = personOneJsObj['nc:PersonSexCode'];
			logger.trace('personOneSex = ['+personOneSex+']');
			// set SSN
			personOneSSN = personOneJsObj['nc:PersonSSNIdentification']['nc:IdentificationID'];
			logger.trace('personOneSSN = ['+personOneSSN+']');
		}				
	}		
	// if no nc:Person 'two' value found 
	if (entryPersonsArrArr.length == 0 || !personTwoJsObj) {
		// either no nc:Person items where found, or no nc:Person with -s:id== 'two' were found 
		logger.trace('entryAuthor was not yet found, attempt to find the Org name instead...');
		// ... so try to get entryAuthor from 'nc:DocumentSource.nc:EntityOrganization.nc:OrganizationName'
		var orgNameArr = jsonpath.eval(docContentJsObj, '$..nc:DocumentSource.nc:EntityOrganization.nc:OrganizationName');
		if (orgNameArr.length > 0) {
			entryAuthor = orgNameArr[0];
		} else {
			// no org name found
			logger.trace('no entryAuthor was found!');
			entryAuthor = "Unknown";
		}
	}
	entryAuthor = util.trimStr(entryAuthor);	
	logger.trace('entryAuthor = ['+entryAuthor+']');
	
	// handle the nc:Facility data:
	
	// - Facility facility id
	// from nc:Facility.nc:FacilityIdentification.nc:IdentificationID
	var facilityId = "";
	// - Facility IdentificationJurisdictionText
	// from nc:Facility.nc:FacilityIdentification.nc:IdentificationJurisdictionText
	var facilityJurisdText = "";
	// - Facility facility name
	// from nc:Facility.nc:FacilityName
	var facilityName = "";
	//var docStatus = "";
	var facilityArr = jsonpath.eval(docContentJsObj, '$..nc:Facility');
	if (facilityArr.length > 0){
		var facility = facilityArr[0];
		facilityId = facility['nc:FacilityIdentification']['nc:IdentificationID'];
		facilityJurisdText = facility['nc:FacilityIdentification']['nc:IdentificationJurisdictionText'];
		facilityName = facility['nc:FacilityName']; 
	}	
	logger.trace('facilityId = ['+facilityId+']');
	logger.trace('facilityJurisdText = ['+facilityJurisdText+']');
	logger.trace('facilityName = ['+facilityName+']');	
	
	
	// get the pr:ClaimNumber value from "cld:Claim.cld:ClaimID"
	var claimNumber = "";
	var claimIDArr = jsonpath.eval(docContentJsObj, '$..cld:Claim.cld:ClaimID');
	if (claimIDArr.length > 0){
		claimNumber = claimIDArr[0];
	}	
	logger.trace('claimNumber = ['+claimNumber+']');
		
	// handle the links data:
	
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
	var jsonFeedJsObject = createJsonFeed(feedTitle, feedVersion, feedSubtitle, dbDocUniqueIdStr, dbDocUploadDateStr, feedAuthor, 
			entryTitle, entryId, entryUpdatedDate, entryAuthor, entryContentType, docCreationDate, docDescrText, docId, docStatus, 
			docTitleText, clientId, clientAA, serviceProviderId, serviceProviderJurisdText, serviceProviderRoleTitle, personTwoFirstName, 
			personTwoMiddleInit, personTwoLastName, personOneFirstName, personOneMiddleInit, personOneLastName, personOneBirthdate, 
			personOneSex, personOneSSN, facilityId, facilityJurisdText, facilityName, claimNumber, entryLinksArr);	
	return jsonFeedJsObject;	
}

function createJsonFeed(feedTitle, feedVersion, feedSubtitle, feedId, feedUpdatedDate, feedAuthor, entryTitle, entryId, 
		entryUpdatedDate, entryAuthor, entryContentType, docCreationDate, docDescrText, docId, docStatus, docTitleText, clientId, 
		clientAA, serviceProviderId, serviceProviderJurisdText, serviceProviderRoleTitle, personTwoFirstName, personTwoMiddleInit, 
		personTwoLastName, personOneFirstName, personOneMiddleInit, personOneLastName, personOneBirthdate, personOneSex, personOneSSN, 
		facilityId, facilityJurisdText, facilityName, claimNumber, entryLinksArr) {
	logger.trace('previewFeedTransformer.createJsonFeed() running');
	
	// make a copy of the global template variable so the copy can be edited and used locally
	var jsonFeedTemplateStr = dbqNotificationFeedTemplate; 
	
	// parse the Json Feed Template string into an Javascript Object to update the feed
	// this throws an error if this won't parse
	var jsonFeedJsObject = JSON.parse(jsonFeedTemplateStr);
		
	// update JSON Feed object to have parameter content
	jsonFeedJsObject.feed.title["#text"] = feedTitle + " ver. "+feedVersion;
	jsonFeedJsObject.feed.subtitle["#text"] = feedSubtitle;
	jsonFeedJsObject.feed.id = FEED_DBQCOLLECTIONNAME + feedId;
	jsonFeedJsObject.feed.updated = feedUpdatedDate;
	jsonFeedJsObject.feed.generator["-version"] = feedVersion;
	jsonFeedJsObject.feed.generator["#text"] = feedTitle;
	jsonFeedJsObject.feed.author = feedAuthor;
	
	jsonFeedJsObject.feed.entry.title = entryTitle;
	jsonFeedJsObject.feed.entry.id = entryId;
	jsonFeedJsObject.feed.entry.published = entryUpdatedDate;
	jsonFeedJsObject.feed.entry.updated = entryUpdatedDate;
	jsonFeedJsObject.feed.entry.author.name = entryAuthor;
		
	// set entry's content type 
	jsonFeedJsObject.feed.entry.content['-type'] = entryContentType;	
	
	// add the preview elements inside the content using the template
	
    // - document creation date
	jsonFeedJsObject.feed.entry.content['pr:Preview']['nc:Document']['nc:DocumentCreationDate']['nc:DateTime'] = docCreationDate;
	
	// - document description text
	jsonFeedJsObject.feed.entry.content['pr:Preview']['nc:Document']['nc:DocumentDescriptionText'] = docDescrText;
	
	// - document id
	jsonFeedJsObject.feed.entry.content['pr:Preview']['nc:Document']['nc:DocumentIdentification']['nc:IdentificationID'] = docId;
	
	// - document status text
	jsonFeedJsObject.feed.entry.content['pr:Preview']['nc:Document']['nc:DocumentStatus']['nc:StatusText'] = docStatus;
	
	// - document title text
	jsonFeedJsObject.feed.entry.content['pr:Preview']['nc:Document']['nc:DocumentTitleText'] = docTitleText;
	
	// - for nc:Client, with "-s:id" = "client": the client id
	jsonFeedJsObject.feed.entry.content['pr:Preview']['vler:Client']['vler:ClientIdentifier']['nc:IdentificationID'] = clientId;
	
	// - for nc:Client, with "-s:id" = "client": vler:AssigningAuthority
	jsonFeedJsObject.feed.entry.content['pr:Preview']['vler:Client']['vler:ClientIdentifier']['vler:AssigningAuthority'] = clientAA;
	
	// - service provider id
	jsonFeedJsObject.feed.entry.content['pr:Preview']['vler:ServiceProvider']['vler:PersonIdentifier']['nc:IdentificationID'] = serviceProviderId;
	
	// - service provider IdentificationJurisdictionText
	jsonFeedJsObject.feed.entry.content['pr:Preview']['vler:ServiceProvider']['vler:PersonIdentifier']['nc:IdentificationJurisdictionText'] = serviceProviderJurisdText;
	
	// - service provider vler:ServiceProviderRoleTitle
	jsonFeedJsObject.feed.entry.content['pr:Preview']['vler:ServiceProvider']['vler:ServiceProviderRoleTitle'] = serviceProviderRoleTitle;
	
	// - for nc:Person, with "-s:id" = "two"...: 
	var entryPersonsArrArr = jsonpath.eval(jsonFeedJsObject, '$..nc:Person');
	var entryPersonsArr = entryPersonsArrArr[0];
	var entryPersonTwo = _.find(entryPersonsArr, function(entryPerson) { return (entryPerson['-s:id'] == 'two'); });
	
	// - for nc:Person, with "-s:id" = "two": nc:PersonName, first, middle, last name value	
	entryPersonTwo['nc:PersonName']['nc:PersonGivenName'] = personTwoFirstName;
	entryPersonTwo['nc:PersonName']['nc:PersonMiddleName'] = personTwoMiddleInit;
	entryPersonTwo['nc:PersonName']['nc:PersonSurName'] = personTwoLastName;
	
	// - for nc:Person, with "-s:id" = "one"...: 
	var entryPersonsArrArr = jsonpath.eval(jsonFeedJsObject, '$..nc:Person');
	var entryPersonsArr = entryPersonsArrArr[0];
	var entryPersonOne = _.find(entryPersonsArr, function(entryPerson) { return (entryPerson['-s:id'] == 'one'); });
	
	// - for nc:Person, with "-s:id" = "one": nc:PersonBirthDate
	entryPersonOne['nc:PersonBirthDate'] = personOneBirthdate;
	
	// - for nc:Person, with "-s:id" = "one": nc:PersonName, first, middle, last name values
	entryPersonOne['nc:PersonName']['nc:PersonGivenName'] = personOneFirstName;
	entryPersonOne['nc:PersonName']['nc:PersonMiddleName'] = personOneMiddleInit;
	entryPersonOne['nc:PersonName']['nc:PersonSurName'] = personOneLastName;
	
	// - for nc:Person, with "-s:id" = "one": nc:PersonSexCode
	entryPersonOne['nc:PersonSexCode'] = personOneSex;
	
	// - for nc:Person, with "-s:id" = "one": PersonSSNIdentification id
	entryPersonOne['nc:PersonSSNIdentification']['nc:IdentificationID'] = personOneSSN;

	// - Facility facility id
	jsonFeedJsObject.feed.entry.content['pr:Preview']['nc:Facility']['nc:FacilityIdentification']['nc:IdentificationID'] = facilityId;
	
	// - Facility IdentificationJurisdictionText
	jsonFeedJsObject.feed.entry.content['pr:Preview']['nc:Facility']['nc:FacilityIdentification']['nc:IdentificationJurisdictionText'] = facilityJurisdText;
	
	// - Facility facility name
	jsonFeedJsObject.feed.entry.content['pr:Preview']['nc:Facility']['nc:FacilityName'] = facilityName;
	
	// - pr:ClaimNumber
	jsonFeedJsObject.feed.entry.content['pr:Preview']['pr:ClaimNumber'] = claimNumber;
		
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
