var config = module.parent.exports.config;
var util = require('../node_modules/vcommons/util/util.js');

// FEED_GRIDFS_BASEHREF must be: "http://localhost:3002/core/fs/";
var FEED_GRIDFS_BASEHREF = config.feed.gridfsBasehref;
var FEED_TITLE = config.feed.title;
var FEED_VERSION = config.feed.version;

var GRIDFS_LABEL = "gridfs://";		

exports.niemDocToJsonFeed = function(jsonDocContentStr, docContentDesc, docId, docUploadDate) {
	if(config.debug) {
		console.log('feedTransformer.niemDocToJsonFeed() running');
	}
	
	//  do null, undefined, empty checks on input parameters, and throw err if so
	if (jsonDocContentStr == null || jsonDocContentStr.length === '') {
		return new Error("feedTransformer.niemDocToJsonFeed(): jsonDocContentStr parameter is empty!");
	}
	if (docContentDesc == null || docContentDesc.length === '') {
		return new Error("feedTransformer.niemDocToJsonFeed(): docContentDesc parameter is empty!");
	}
	if (docId == null || docId.length === '') {
		return new Error("feedTransformer.niemDocToJsonFeed(): docId parameter is empty!");
	}
	if (docUploadDate == null || docUploadDate.length === '') {
		return new Error("feedTransformer.niemDocToJsonFeed(): docUploadDate parameter is empty!");
	}
	
	// parse the JSON Text string into a JavaScript Object
	// Note: throws an err if this won't parse?
	var jsonInputDocJsObject = JSON.parse(jsonDocContentStr);
	//console.log('niemDocToJsonFeed() after JSON.parse()...');	
	
	var docTitle, docVersion, docSubtitle, docAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, entryContentBodyJsObject, entryContentType;
	var entryLinksArr;

	// feed title
	docTitle = FEED_TITLE;
	
	// feed/LENS version #
	docVersion = FEED_VERSION;
	
	// feed author
	// TODO: Should this be the same as the docTitle?
	docAuthor = docTitle; 	
	
	// entry content-type
	entryContentType = "application/xml";
	//console.log('entryContentType = ['+entryContentType+']');
	
	// extract info out of jsonInputDocJsObject, depending on contents 	
	if (docContentDesc.toLowerCase().indexOf("ecft") != -1) {
		//console.log('feedTransformer.niemDocToJsonFeed() ecft content processing ...');
		
		//console.log('docTitle = ['+docTitle+']');
		//console.log('docVersion = ['+docVersion+']');
		//console.log('docAuthor = ['+docAuthor+']');
		
		// feed subtitle
		//var docSubtitle = "ElectronicCaseFile Create Notification";	// TODO: Is this correct? Should this be a LENS event description instead of nc:DocumentTitleText?
		docSubtitle = jsonInputDocJsObject['case:ElectronicCaseFile']['case:CommonData']['nc:Document']['nc:DocumentTitleText'];
		//console.log('docSubtitle = ['+docSubtitle+']');
		
		// entry title
		entryTitle = jsonInputDocJsObject['case:ElectronicCaseFile']['case:CommonData']['nc:Document']['nc:DocumentDescriptionText'];
		//console.log('entryTitle = ['+entryTitle+']');
		
		// entry id
		// TODO: Is this correct value to use? It is the first of three. Also, should this be a 3-part id? This is only one uniqueDocumentId now.
		//entryId = jsonInputDocJsObject['case:ElectronicCaseFile']['case:CommonData']['nc:Document']['nc:DocumentIdentification'][0]['nc:IdentificationID'];
		var entryDocumentIdentification;
		var documentIdentificationsArr = jsonInputDocJsObject['case:ElectronicCaseFile']['case:CommonData']['nc:Document']['nc:DocumentIdentification'];
		//console.log('documentIdentificationsArr = ['+documentIdentificationsArr+']');		
		for (var i = 0; i < documentIdentificationsArr.length; i++) {
			//console.log(documentIdentificationsArr[i]);
		    // if nc:DocumentIdentification has no nc:IdentificationCategoryText or no nc:IdentificationCategoryDescriptionText, 
			//    then have the desired entry nc:DocumentIdentification element
			if (documentIdentificationsArr[i]["nc:IdentificationCategoryText"] == null) {
				entryDocumentIdentification = documentIdentificationsArr[i];
			}
			
		}	
		var entryId = entryDocumentIdentification['nc:IdentificationID'];
		//console.log('entryId = ['+entryId+']');
		
		// entry updated date
		entryUpdatedDate = jsonInputDocJsObject['case:ElectronicCaseFile']['case:CommonData']['nc:Document']['nc:DocumentCreationDate']['nc:DateTime'];
		//console.log('entryUpdatedDate = ['+entryUpdatedDate+']');
		
		// entry author
		var entryAuthorFirstName = ""; //?
		var entryAuthorMiddleInit = "";
		// TODO: Is this correct for eCFT? No physician name included.
		var entryAuthorLastName = jsonInputDocJsObject['case:ElectronicCaseFile']['case:CommonData']['nc:DocumentSource']['nc:EntityOrganization']['nc:OrganizationName'];
		entryAuthor = entryAuthorFirstName + ' ' + entryAuthorMiddleInit + ' ' + entryAuthorLastName; 
		entryAuthor = util.trimStr(entryAuthor);
		//console.log('entryAuthor = ['+entryAuthor+']');		
		
		// create 2 entry links, get content-types for each, and put into entryLinksArr array
		var gridfsId1Raw = jsonInputDocJsObject['case:ElectronicCaseFile']['case:CommonData']['nc:Document']['nc:DocumentFileControlID'];
		// remove "gridfs://" if present 		
		var gridfsId1 = gridfsId1Raw.replace(GRIDFS_LABEL,"");  		
		var link1 = FEED_GRIDFS_BASEHREF + gridfsId1;
		var link1ContentType = jsonInputDocJsObject['case:ElectronicCaseFile']['case:CommonData']['nc:Document']['nc:DocumentFormatText'];
		var gridfsId2Raw = jsonInputDocJsObject['case:ElectronicCaseFile']['case:Attachments']['nc:Attachment']['nc:BinaryLocationURI'];
		// remove "gridfs://" if present 		
		var gridfsId2 = gridfsId2Raw.replace(GRIDFS_LABEL,"");  
		var link2 = FEED_GRIDFS_BASEHREF + gridfsId2;
		var link2ContentType = jsonInputDocJsObject['case:ElectronicCaseFile']['case:Attachments']['nc:Attachment']['nc:BinaryFormatStandardName'];		
		entryLinksArr =  [
		  [link1,link1ContentType],
		  [link2,link2ContentType]
		];
		//console.log('entryLinksArr = ['+entryLinksArr+']');
		
	} else if (docContentDesc.toLowerCase().indexOf("str") != -1) {
		//console.log('feedTransformer.niemDocToJsonFeed() str content processing ...');
		
		//console.log('docTitle = ['+docTitle+']');
		//console.log('docVersion = ['+docVersion+']');
		//console.log('docAuthor = ['+docAuthor+']');
		
		// feed subtitle
		//var docSubtitle = "ServiceTreatmentRecord Create Notification"; // TODO: Is this correct? Should this be a LENS event description instead of nc:DocumentTitleText?
		docSubtitle = jsonInputDocJsObject['case:ServiceTreatmentRecord']['case:CommonData']['nc:Document']['nc:DocumentTitleText'];
		//console.log('docSubtitle = ['+docSubtitle+']');
		
		// entry title
		entryTitle = jsonInputDocJsObject['case:ServiceTreatmentRecord']['case:CommonData']['nc:Document']['nc:DocumentDescriptionText'];
		//console.log('entryTitle = ['+entryTitle+']');
		
		// entry id
		// TODO: Is this correct value to use? It is the first of three. Also, should this be a 3-part id? This is only one uniqueDocumentId now.
		//entryId = jsonInputDocJsObject['case:ServiceTreatmentRecord']['case:CommonData']['nc:Document']['nc:DocumentIdentification'][0]['nc:IdentificationID'];		
		var entryDocumentIdentification;
		var documentIdentificationsArr = jsonInputDocJsObject['case:ServiceTreatmentRecord']['case:CommonData']['nc:Document']['nc:DocumentIdentification'];
		//console.log('documentIdentificationsArr = ['+documentIdentificationsArr+']');		
		for (var i = 0; i < documentIdentificationsArr.length; i++) {
			//console.log(documentIdentificationsArr[i]);
		    // if nc:DocumentIdentification has no nc:IdentificationCategoryText or no nc:IdentificationCategoryDescriptionText, 
			//    then have the desired entry nc:DocumentIdentification element
			if (documentIdentificationsArr[i]["nc:IdentificationCategoryText"] == null) {
				entryDocumentIdentification = documentIdentificationsArr[i];
			}
			
		}	
		var entryId = entryDocumentIdentification['nc:IdentificationID'];
		//console.log('entryId = ['+entryId+']');
		
		// entry updated date
		entryUpdatedDate = jsonInputDocJsObject['case:ServiceTreatmentRecord']['case:CommonData']['nc:Document']['nc:DocumentCreationDate']['nc:DateTime'];
		//console.log('entryUpdatedDate = ['+entryUpdatedDate+']');
		
		// entry author
		var entryAuthorFirstName = ""; //?
		var entryAuthorMiddleInit = "";
		// TODO: Is this correct for STR? No physician name included.
		var entryAuthorLastName = jsonInputDocJsObject['case:ServiceTreatmentRecord']['case:CommonData']['nc:DocumentSource']['nc:EntityOrganization']['nc:OrganizationName'];
		entryAuthor = entryAuthorFirstName + ' ' + entryAuthorMiddleInit + ' ' + entryAuthorLastName; 
		entryAuthor = util.trimStr(entryAuthor);
		//console.log('entryAuthor = ['+entryAuthor+']');	
		
		// create 1 entry link, get content-types for it, and put into entryLinksArr array		
		var gridfsId2Raw = jsonInputDocJsObject['case:ServiceTreatmentRecord']['case:Attachments']['nc:Attachment']['nc:BinaryLocationURI'];
		// remove "gridfs://" if present 		
		var gridfsId2 = gridfsId2Raw.replace(GRIDFS_LABEL,"");  
		var link2 = FEED_GRIDFS_BASEHREF + gridfsId2;
		var link2ContentType = jsonInputDocJsObject['case:ServiceTreatmentRecord']['case:Attachments']['nc:Attachment']['nc:BinaryFormatStandardName'];		
		entryLinksArr =  [		  
		  [link2,link2ContentType]
		];
		//console.log('entryLinksArr = ['+entryLinksArr+']');
		
	} else if (docContentDesc.toLowerCase().indexOf("dbq") != -1) {
		//console.log('feedTransformer.niemDocToJsonFeed() dbq content processing ...');
				
		//console.log('docTitle = ['+docTitle+']');
		//console.log('docVersion = ['+docVersion+']');
		//console.log('docAuthor = ['+docAuthor+']');
		
		// feed subtitle
		//var docSubtitle = "Exam Result (DisabilityBenefitsQuestionnaire) Create Notification"; // TODO: Is this correct? Should this be a LENS event description instead of nc:DocumentTitleText?
		docSubtitle = jsonInputDocJsObject['cld:Claim']['cld:CommonData']['nc:Document']['nc:DocumentTitleText'];
		//console.log('docSubtitle = ['+docSubtitle+']');
		
		// entry title
		entryTitle = jsonInputDocJsObject['cld:Claim']['cld:CommonData']['nc:Document']['nc:DocumentDescriptionText'];
		//console.log('entryTitle = ['+entryTitle+']');
		
		// entry id		
		// TODO: Should this be a 3-part id? This is only one uniqueDocumentId now.
		entryId = jsonInputDocJsObject['cld:Claim']['cld:CommonData']['nc:Document']['nc:DocumentIdentification']['nc:IdentificationID'];
		//console.log('entryId = ['+entryId+']');
		
		// entry updated date
		entryUpdatedDate = jsonInputDocJsObject['cld:Claim']['cld:CommonData']['nc:Document']['nc:DocumentCreationDate']['nc:DateTime'];
		//console.log('entryUpdatedDate = ['+entryUpdatedDate+']');
		
		// entry author
		// using nc:Person s:id="two"
		var entryAuthorPerson;
		var entryPersonsArr = jsonInputDocJsObject['cld:Claim']['cld:CommonData']['nc:Person'];
		//console.log('entryPersonsArr = ['+entryPersonsArr+']');		
		for (var i = 0; i < entryPersonsArr.length; i++) {
			//console.log(entryPersonsArr[i]["-s:id"]);
		    // if nc:Person -s:id == two, then have doc author element
			if (entryPersonsArr[i]["-s:id"] == "two") {
				entryAuthorPerson = entryPersonsArr[i];
			}
		}		
		var entryAuthorFirstName = entryAuthorPerson['nc:PersonName']['nc:PersonGivenName'];
		var entryAuthorMiddleInit = entryAuthorPerson['nc:PersonName']['nc:PersonMiddleName'];		
		var entryAuthorLastName = entryAuthorPerson['nc:PersonName']['nc:PersonSurName'];
		entryAuthor = entryAuthorFirstName + ' ' + entryAuthorMiddleInit + ' ' + entryAuthorLastName; 
		entryAuthor = util.trimStr(entryAuthor);
		//console.log('entryAuthor = ['+entryAuthor+']');
		
		// create 2 entry links, get content-types for each, and put into entryLinksArr array
		var gridfsId1Raw = jsonInputDocJsObject['cld:Claim']['cld:CommonData']['nc:Document']['nc:DocumentFileControlID'];
		// remove "gridfs://" if present 		
		var gridfsId1 = gridfsId1Raw.replace(GRIDFS_LABEL,"");  		
		var link1 = FEED_GRIDFS_BASEHREF + gridfsId1;
		var link1ContentType = jsonInputDocJsObject['cld:Claim']['cld:CommonData']['nc:Document']['nc:DocumentFormatText'];
		var gridfsId2Raw = jsonInputDocJsObject['cld:Claim']['cld:Attachments']['nc:Attachment']['nc:BinaryLocationURI'];
		// remove "gridfs://" if present 		
		var gridfsId2 = gridfsId2Raw.replace(GRIDFS_LABEL,"");  
		var link2 = FEED_GRIDFS_BASEHREF + gridfsId2;
		var link2ContentType = jsonInputDocJsObject['cld:Claim']['cld:Attachments']['nc:Attachment']['nc:BinaryFormatStandardName'];		
		entryLinksArr =  [
		  [link1,link1ContentType],
		  [link2,link2ContentType]
		];
		//console.log('entryLinksArr = ['+entryLinksArr+']');
		
	} else {
		// throw err
		return new Error("feedTransformer.niemDocToJsonFeed(): Unknown document type received!");
	}	
	
	// create JSON Feed using the extracted data
	var jsonFeedJsObject = this.createJsonFeed(docTitle, docVersion, docSubtitle, docId, docUploadDate, docAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, jsonInputDocJsObject, entryContentType, entryLinksArr);	
	//console.log('feedTransformer.niemDocToJsonFeed() returning....');	
	return jsonFeedJsObject;	
}

exports.createJsonFeed = function(docTitle, docVersion, docSubtitle, docId, docUpdatedDate, docAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, entryContentBodyJsObject, entryContentType, entryLinksArr) {

	// if contentLinksArr size == 1, then use...
	var jsonNotificationFeedOneEntryOneLinkTemplateStr = "{"+
	   "\"feed\": {"+
	    "\"-xmlns\": \"http://www.w3.org/2005/Atom\","+
	    "\"-xmlns:pr\": \"http://vler.va.gov/vler/schemas/health/clinicalDocuments/clinicalAssessments/cpExams/1.0\","+
	    "\"-xmlns:xsi\": \"http://www.w3.org/2001/XMLSchema-instance\","+
	    "\"-xsi:schemaLocation\": \"http://www.w3.org/2005/Atom http://vler.va.gov/vler/schemas/atom/2005/vler/0.2/atom.xsd\","+
	    "\"title\": {"+
	    "  \"-type\": \"text\","+
	    "  \"#text\": \"VLER DAS Life Event Notification Service\""+
	    "},"+
	    "\"subtitle\": {"+
	    "  \"-type\": \"text\","+
	    "  \"#text\": \"DBQ Status Is Completed\""+
	    "},"+
	    "\"id\": \"10000\","+
	    "\"updated\": \"2013-05-10T14:27:15-04:00\","+
	    "\"generator\": {"+
	    "  \"-version\": \"1.0\","+
	    "  \"#text\": \"VLER DAS Life Event Notification Service\""+
	    "},"+
	    "\"author\": { \"name\": \"VLER DAS Life Event Notification Service\" },"+
	    "\"entry\": {"+
	    "  \"title\": \"Ankle Conditions Form\","+
	    "  \"id\": \"10000\","+
	    "  \"published\": \"2012-08-09T16:27:38-05:00\","+
	    "  \"updated\": \"2012-08-09T16:27:38-05:00\","+
	    "  \"author\": { \"name\": \"Frank A James\" },"+
	    "  \"content\": {"+
	    "    \"-type\": \"application/xml\","+
	    "    \"#text\": \"insert content here\""+
	    "  },"+
	    "  \"link\": {"+
	    "    \"-href\": \"https://localhost:3002/core/fs/abcd1234abcd1234abcd1234\","+
	    "    \"-hreflang\": \"en\","+
	    "    \"-length\": \"1000000\","+
	    "    \"-rel\": \"enclosure\","+
	    "    \"-title\": \"Attachment\","+
	    "    \"-type\": \"application/xml\""+
	    "  }"+
	    "}"+
	  "}"+
	"}";
	//console.log('jsonNotificationFeedOneEntryOneLinkTemplateStr='+jsonNotificationFeedOneEntryOneLinkTemplateStr);
	
	// if contentLinksArr size == 2, then use...
	var jsonNotificationFeedOneEntryTwoLinksTemplateStr = "{"+
	   "\"feed\": {"+
	    "\"-xmlns\": \"http://www.w3.org/2005/Atom\","+
	    "\"-xmlns:pr\": \"http://vler.va.gov/vler/schemas/health/clinicalDocuments/clinicalAssessments/cpExams/1.0\","+
	    "\"-xmlns:xsi\": \"http://www.w3.org/2001/XMLSchema-instance\","+
	    "\"-xsi:schemaLocation\": \"http://www.w3.org/2005/Atom http://vler.va.gov/vler/schemas/atom/2005/vler/0.2/atom.xsd\","+
	    "\"title\": {"+
	    "  \"-type\": \"text\","+
	    "  \"#text\": \"VLER DAS Life Event Notification Service\""+
	    "},"+
	    "\"subtitle\": {"+
	    "  \"-type\": \"text\","+
	    "  \"#text\": \"DBQ Status Is Completed\""+
	    "},"+
	    "\"id\": \"10000\","+
	    "\"updated\": \"2013-05-10T14:27:15-04:00\","+
	    "\"generator\": {"+
	    "  \"-version\": \"1.0\","+
	    "  \"#text\": \"VLER DAS Life Event Notification Service\""+
	    "},"+
	    "\"author\": { \"name\": \"VLER DAS Life Event Notification Service\" },"+
	    "\"entry\": {"+
	    "  \"title\": \"Ankle Conditions Form\","+
	    "  \"id\": \"10000\","+
	    "  \"published\": \"2012-08-09T16:27:38-05:00\","+
	    "  \"updated\": \"2012-08-09T16:27:38-05:00\","+
	    "  \"author\": { \"name\": \"Frank A James\" },"+
	    "  \"content\": {"+
	    "    \"-type\": \"application/xml\","+
	    "    \"#text\": \"insert content here\""+
	    "  },"+
	    "\"link\": ["+
	    "         {"+
	    "           \"-title\": \"Subject Document\","+
	    "           \"-rel\": \"enclosure\","+
	    "           \"-href\": \"https://localhost:3002/core/fs/abcd1234abcd1234abcd1234\","+
	    "           \"-type\": \"application/xml\","+
	    "           \"-length\": \"1000000\","+
	    "           \"-hreflang\": \"en\""+
	    "         },"+
	    "         {"+
	    "           \"-title\": \"Attachment\","+
	    "           \"-rel\": \"enclosure\","+
	    "           \"-href\": \"https://localhost:3002/core/fs/abcd1234abcd1234abcd1235\","+
	    "           \"-type\": \"image/jpeg\","+
	    "           \"-length\": \"1000000\","+
	    "           \"-hreflang\": \"en\""+
	    "         }"+
	    "       ]"+
	    "}"+
	  "}"+
	"}";
	//console.log('jsonNotificationFeedOneEntryOneLinkTemplateStr='+jsonNotificationFeedOneEntryOneLinkTemplateStr);
	
	var jsonFeedTemplateStr;	
	// choose template
	if (2 == entryLinksArr.length) {
		jsonFeedTemplateStr = jsonNotificationFeedOneEntryTwoLinksTemplateStr;	
	} else if (1 == entryLinksArr.length) {	
		jsonFeedTemplateStr = jsonNotificationFeedOneEntryOneLinkTemplateStr;
	} else {
		return new Error("Can't have entryLinksArr without either 1 or 2 links! No JSON feed template assigned.");
	}
	
	// parse the Json Feed Template string into an Javascript Object to update the feed
	// this throws an error if this won't parse
	var jsonFeedJsObject = JSON.parse(jsonFeedTemplateStr);
	
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
	
	jsonFeedJsObject.feed.entry.content["-type"] = entryContentType;
	
	// set links
	if (2 == entryLinksArr.length) {
		jsonFeedJsObject.feed.entry.link[0]["-href"] = entryLinksArr[0][0];
		jsonFeedJsObject.feed.entry.link[0]["-type"] = entryLinksArr[0][1];
		jsonFeedJsObject.feed.entry.link[1]["-href"] = entryLinksArr[1][0];
		jsonFeedJsObject.feed.entry.link[1]["-type"] = entryLinksArr[1][1];
	} else if (1 == entryLinksArr.length) {
		jsonFeedJsObject.feed.entry.link["-href"] = entryLinksArr[0][0];
		jsonFeedJsObject.feed.entry.link["-type"] = entryLinksArr[0][1];
	} else {
		return new Error("Can't have entryLinksArr without either 1 or 2 links! Entry links not assigned.");
	}
		
	//console.log('jsonFeedJsObject='+JSON.stringify(jsonFeedJsObject));
	return jsonFeedJsObject;	
}
