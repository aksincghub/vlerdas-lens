var should = require('should');
var fs = require('fs');
var config = require('config');
module.exports.config = config;

var feedTransformer = require('../lib/feedTransformer.js');
	
	describe('createJsonFeed()', function() {
			
		var jsonDocContentStr = getFileAsStr("./test/dataIn","simpleTest.json");				
		
		// parse the input content document string into a Javascript Object
		var jsonInputDocJsObject = JSON.parse(jsonDocContentStr);
		
		var docTitle="LENS Notification"; // LENS Title
		var docVersion = "0.1"; // LENS version #
		var docSubtitle="DBQ Record Created";
		var docId="4321abcd4321abcd4321abcd";
		var docUpdatedDate="2012-08-09T16:27:38-05:00";
		var docAuthor="Ralph Jones";
		
		var entryTitle = "entry title";
		var entryId = "entry id";
		var entryUpdatedDate = "entry updated date";
		var entryAuthor = "entry author";
		var entryContentBodyJsObject=jsonInputDocJsObject;
		var entryContentType="application/xml";			
			
		describe('OneEntry-OneLink', function() {
			var link2Obj = {
					"title":"Attachment",
					"type":"image/jpeg",			
					"href":"https://localhost:3002/core/fs/abcd1234abcd1234abcd1235"};
			
			var entryLinksArrOnelink = [link2Obj];
			var jsonFeedOneEntryOneLinkJsObject = feedTransformer.createJsonFeed(docTitle, docVersion, docSubtitle, docId, docUpdatedDate, docAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, entryContentBodyJsObject, entryContentType, entryLinksArrOnelink);
		    
			it('should return this expected value when given a certain input document', function() {			    			    	
		    	var jsonFeedOneEntryOneLinkStr = JSON.stringify(jsonFeedOneEntryOneLinkJsObject);		    	
				var oneEntryOneLinkValidOutputStr = getFileAsStr("./test/dataOut","oneEntryOneLink_simpleTestContent_ValidOutput.json");
				jsonFeedOneEntryOneLinkStr.should.equal(oneEntryOneLinkValidOutputStr);	
		    })
		  })	
		  
		describe('OneEntry-TwoLinks', function() {
			var link1Obj = {
					"title":"Subject Document",
					"type":"application/xml",			
					"href":"https://localhost:3002/core/fs/abcd1234abcd1234abcd1234"};
			var link2Obj = {
					"title":"Attachment",
					"type":"image/jpeg",			
					"href":"https://localhost:3002/core/fs/abcd1234abcd1234abcd1235"};			
			var entryLinksArrTwolinks = [link1Obj,link2Obj];
			
			var jsonFeedOneEntryTwoLinksJsObject = feedTransformer.createJsonFeed(docTitle, docVersion, docSubtitle, docId, docUpdatedDate, docAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, entryContentBodyJsObject, entryContentType, entryLinksArrTwolinks);
			
			it('should return this expected value when given a certain input document', function() {	
				var jsonFeedOneEntryTwoLinksStr = JSON.stringify(jsonFeedOneEntryTwoLinksJsObject);
				//console.log('jsonFeedOneEntryTwoLinksStr='+jsonFeedOneEntryTwoLinksStr);
				var oneEntryTwoLinksValidOutputStr = getFileAsStr("./test/dataOut","oneEntryTwoLinks_simpleTestContent_ValidOutput.json");				
				jsonFeedOneEntryTwoLinksStr.should.equal(oneEntryTwoLinksValidOutputStr);	
		    })
		  })		
	});
		
	describe('niemDocStrToJsonFeed()', function() {
	    describe('for the eCFT Notification JSON Feed', function() {	    	
	    	var eCFTJsonDocContentStr = getFileAsStr("./test/dataIn","eCFTCaseFile.json");			
			var docContentDesc = 'eCFT';  
			var docId="4321abcd4321abcd4321abcd";
			var docUploadDate="2012-08-09T16:27:38-05:00";
			
			var ecftJsonFeedJsObject = feedTransformer.niemDocStrToJsonFeed(eCFTJsonDocContentStr, docId, docUploadDate);
			
		    it('should return this expected value with two links', function() {		    	
		    	var ecftJsonFeedStr = JSON.stringify(ecftJsonFeedJsObject);	
		    	var ecftJsonFeedValidOutputStr = getFileAsStr("./test/dataOut","ecftNotificationFeed_ValidDoc.json");
		    	ecftJsonFeedStr.should.equal(ecftJsonFeedValidOutputStr);
		    })
		  })
		  
		  describe('for the eCFT Notification JSON Feed with the 2nd Attachment', function() {	    	
	    	var eCFT2ndAttachmJsonDocContentStr = getFileAsStr("./test/dataIn","ecftCaseFile-2attchms.json");			
			var docContentDesc = 'eCFT';  
			var docId="4321abcd4321abcd4321abcd";
			var docUploadDate="2012-08-09T16:27:38-05:00";
			
			var ecft2ndAttachmJsonFeedJsObject = feedTransformer.niemDocStrToJsonFeed(eCFT2ndAttachmJsonDocContentStr, docId, docUploadDate);
			
		    it('should return this expected value with three links', function() {		    	
		    	var ecft2ndAttachmJsonFeedStr = JSON.stringify(ecft2ndAttachmJsonFeedJsObject);	
		    	var ecft2ndAttachmJsonFeedValidOutputStr = getFileAsStr("./test/dataOut","ecftExtraLinkNotificationFeed_ValidDoc.json");
		    	ecft2ndAttachmJsonFeedStr.should.equal(ecft2ndAttachmJsonFeedValidOutputStr);
		    })
		  })
		  
		  describe('for the DBQ Notification JSON Feed', function() {	    	
	    	var dbqJsonDocContentStr = getFileAsStr("./test/dataIn","CapriDbqClaim.json");			
			var docContentDesc = 'DBQ';  
			var docId="4321abcd4321abcd4321abcd";
			var docUploadDate="2012-08-09T16:27:38-05:00";
			
			var dbqJsonFeedJsObject = feedTransformer.niemDocStrToJsonFeed(dbqJsonDocContentStr, docId, docUploadDate);
			
		    it('should return this expected value with two links', function() {		    	
		    	var dbqJsonFeedStr = JSON.stringify(dbqJsonFeedJsObject);
		    	var dbqJsonFeedValidOutputStr = getFileAsStr("./test/dataOut","dbqNotificationFeed_ValidDoc.json");
		    	dbqJsonFeedStr.should.equal(dbqJsonFeedValidOutputStr);
		    })
		  })
		  
		  describe('for the STR Notification JSON Feed (with no Subject Document Link)', function() {	    	
	    	var strJsonDocContentStr = getFileAsStr("./test/dataIn","STR.json");			
			var docContentDesc = 'STR';  
			var docId="4321abcd4321abcd4321abcd";
			var docUploadDate="2012-08-09T16:27:38-05:00";
			
			var strJsonFeedJsObject = feedTransformer.niemDocStrToJsonFeed(strJsonDocContentStr, docId, docUploadDate);
			
		    it('should return this expected value with one link', function() {		    	
		    	var strJsonFeedStr = JSON.stringify(strJsonFeedJsObject);
		    	var strJsonFeedValidOutputStr = getFileAsStr("./test/dataOut","strNotificationFeed_ValidDoc.json");
		    	strJsonFeedStr.should.equal(strJsonFeedValidOutputStr);
		    })
		  })	  
	});  
	
	describe('niemDocJsObjToJsonFeed', function() {
	    describe('for the eCFT Notification JSON Feed', function() {	    	
	    	var eCFTJsonDocContentStr = getFileAsStr("./test/dataIn","eCFTCaseFile.json");
	    	var eCFTJsonDocContentJsObj = JSON.parse(eCFTJsonDocContentStr);
			var docContentDesc = 'eCFT';  
			var docId="4321abcd4321abcd4321abcd";
			var docUploadDate="2012-08-09T16:27:38-05:00";
			
			var ecftJsonFeedJsObject = feedTransformer.niemDocJsObjToJsonFeed(eCFTJsonDocContentJsObj, docId, docUploadDate);
			
		    it('should return this expected value with two links', function() {		    	
		    	var ecftJsonFeedStr = JSON.stringify(ecftJsonFeedJsObject);	
		    	var ecftJsonFeedValidOutputStr = getFileAsStr("./test/dataOut","ecftNotificationFeed_ValidDoc.json");
		    	ecftJsonFeedStr.should.equal(ecftJsonFeedValidOutputStr);
		    })
		  })
		  
		  describe('for the eCFT Notification JSON Feed with the 2nd Attachment', function() {	    	
	    	var eCFT2ndAttachmJsonDocContentStr = getFileAsStr("./test/dataIn","ecftCaseFile-2attchms.json");	
	    	var eCFT2ndAttachmJsonDocContentJsObj = JSON.parse(eCFT2ndAttachmJsonDocContentStr);
			var docContentDesc = 'eCFT';  
			var docId="4321abcd4321abcd4321abcd";
			var docUploadDate="2012-08-09T16:27:38-05:00";
			
			var ecft2ndAttachmJsonFeedJsObject = feedTransformer.niemDocJsObjToJsonFeed(eCFT2ndAttachmJsonDocContentJsObj, docId, docUploadDate);
			
		    it('should return this expected value with three links', function() {		    	
		    	var ecft2ndAttachmJsonFeedStr = JSON.stringify(ecft2ndAttachmJsonFeedJsObject);	
		    	var ecft2ndAttachmJsonFeedValidOutputStr = getFileAsStr("./test/dataOut","ecftExtraLinkNotificationFeed_ValidDoc.json");
		    	ecft2ndAttachmJsonFeedStr.should.equal(ecft2ndAttachmJsonFeedValidOutputStr);
		    })
		  })
		  
		  describe('for the DBQ Notification JSON Feed', function() {	    	
	    	var dbqJsonDocContentStr = getFileAsStr("./test/dataIn","CapriDbqClaim.json");	
	    	var dbqJsonDocContentJsObj = JSON.parse(dbqJsonDocContentStr);
			var docContentDesc = 'DBQ';  
			var docId="4321abcd4321abcd4321abcd";
			var docUploadDate="2012-08-09T16:27:38-05:00";
			
			var dbqJsonFeedJsObject = feedTransformer.niemDocJsObjToJsonFeed(dbqJsonDocContentJsObj, docId, docUploadDate);
			
		    it('should return this expected value with two links', function() {		    	
		    	var dbqJsonFeedStr = JSON.stringify(dbqJsonFeedJsObject);
		    	var dbqJsonFeedValidOutputStr = getFileAsStr("./test/dataOut","dbqNotificationFeed_ValidDoc.json");
		    	dbqJsonFeedStr.should.equal(dbqJsonFeedValidOutputStr);
		    })
		  })
		  
		  describe('for the STR Notification JSON Feed (with no Subject Document Link)', function() {	    	
	    	var strJsonDocContentStr = getFileAsStr("./test/dataIn","STR.json");
	    	var strJsonDocContentJsObj = JSON.parse(strJsonDocContentStr);
			var docContentDesc = 'STR';  
			var docId="4321abcd4321abcd4321abcd";
			var docUploadDate="2012-08-09T16:27:38-05:00";
			
			var strJsonFeedJsObject = feedTransformer.niemDocJsObjToJsonFeed(strJsonDocContentJsObj, docId, docUploadDate);
			
		    it('should return this expected value with one link', function() {		    	
		    	var strJsonFeedStr = JSON.stringify(strJsonFeedJsObject);
		    	var strJsonFeedValidOutputStr = getFileAsStr("./test/dataOut","strNotificationFeed_ValidDoc.json");
		    	strJsonFeedStr.should.equal(strJsonFeedValidOutputStr);
		    })
		  })	  
	}); 
 
	function getFileAsStr(dirname,filename) {
		//e.g. dirname = "./test/dataIn"; 
		var filepath = dirname + '/'+filename;	
		var data = fs.readFileSync(filepath);
		return data.toString();
	} 
    
