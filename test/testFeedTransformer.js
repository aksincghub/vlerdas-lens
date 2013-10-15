var should = require('should');
var fs = require('fs');
var config = require('config');
module.exports.config = config;

var feedTransformer = require('../lib/feedTransformer.js');
	
	describe('createJsonFeed()', function() {
			
		var jsonDocContentStr = getFileAsStr("./test/dataIn","simpleTest.json");
		//console.log("jsonDocContentStr = "+jsonDocContentStr);			
		
		// parse the input document string into a Javascript Object
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
		
		// Note: entryLinksArr must have either 1 or 2 links		
		
		describe('OneEntry-OneLink', function() {
			var entryLinksArrOnelink = [		      		               
				      		               ['http://localhost:3001/core/fs/1234567890ab1234567890ac','application/pdf']
				      		           ];
			var jsonFeedOneEntryOneLinkJsObject = feedTransformer.createJsonFeed(docTitle, docVersion, docSubtitle, docId, docUpdatedDate, docAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, entryContentBodyJsObject, entryContentType, entryLinksArrOnelink);
		    
			it('should return this expected value when given a certain input document', function() {			    			    	
		    	var jsonFeedOneEntryOneLinkStr = JSON.stringify(jsonFeedOneEntryOneLinkJsObject);		    	
		    	//console.log('jsonFeedOneEntryOneLinkStr='+jsonFeedOneEntryOneLinkStr);
				var oneEntryOneLinkValidOutputStr = getFileAsStr("./test/dataOut","oneEntryOneLink_simpleTestContent_ValidOutput.json");
				jsonFeedOneEntryOneLinkStr.should.equal(oneEntryOneLinkValidOutputStr);	
		    })
		  })	
		  
		describe('OneEntry-TwoLinks', function() {
			var entryLinksArrTwolinks = [
			      		               ['http://localhost:3001/core/fs/1234567890ab1234567890ab','application/xml'],
			      		               ['http://localhost:3001/core/fs/1234567890ab1234567890ac','application/pdf']
			      		           ];
			var jsonFeedOneEntryTwoLinksJsObject = feedTransformer.createJsonFeed(docTitle, docVersion, docSubtitle, docId, docUpdatedDate, docAuthor, entryTitle, entryId, entryUpdatedDate, entryAuthor, entryContentBodyJsObject, entryContentType, entryLinksArrTwolinks);
			
			it('should return this expected value when given a certain input document', function() {	
				var jsonFeedOneEntryTwoLinksStr = JSON.stringify(jsonFeedOneEntryTwoLinksJsObject);
				//console.log('jsonFeedOneEntryTwoLinksStr='+jsonFeedOneEntryTwoLinksStr);
				var oneEntryTwoLinksValidOutputStr = getFileAsStr("./test/dataOut","oneEntryTwoLinks_simpleTestContent_ValidOutput.json");				
				jsonFeedOneEntryTwoLinksStr.should.equal(oneEntryTwoLinksValidOutputStr);	
		    })
		  })		
	});

	describe('niemDocToJsonFeed()', function() {
	    describe('for the eCFT Notification JSON Feed', function() {	    	
	    	var eCFTJsonDocContentStr = getFileAsStr("./test/dataIn","eCFTCaseFile.json");
			//console.log("eCFTJsonDocContentStr = "+eCFTJsonDocContentStr);		
			
			var docContentDesc = 'eCFT';  
			var docId="4321abcd4321abcd4321abcd";
			var docUploadDate="2012-08-09T16:27:38-05:00";
			
			var ecftJsonFeedJsObject = feedTransformer.niemDocToJsonFeed(eCFTJsonDocContentStr, docContentDesc, docId, docUploadDate);
			
		    it('should return this expected value when given an eCFT JSON input document with two links', function() {		    	
		    	var ecftJsonFeedStr = JSON.stringify(ecftJsonFeedJsObject);	
		    	//console.log('ecftJsonFeedStr='+ecftJsonFeedStr);
		    	var ecftJsonFeedValidOutputStr = getFileAsStr("./test/dataOut","ecftNotificationFeed_ValidDoc.json");
		    	ecftJsonFeedStr.should.equal(ecftJsonFeedValidOutputStr);
		    })
		  })
		  
		  describe('for the DBQ Notification JSON Feed', function() {	    	
	    	var dbqJsonDocContentStr = getFileAsStr("./test/dataIn","CapriDbqClaim.json");
			//console.log("dbqJsonDocContentStr = "+dbqJsonDocContentStr);		
			
			var docContentDesc = 'DBQ';  
			var docId="4321abcd4321abcd4321abcd";
			var docUploadDate="2012-08-09T16:27:38-05:00";
			
			var dbqJsonFeedJsObject = feedTransformer.niemDocToJsonFeed(dbqJsonDocContentStr, docContentDesc, docId, docUploadDate);
			
		    it('should return this expected value when given an DBQ JSON input document with two links', function() {		    	
		    	var dbqJsonFeedStr = JSON.stringify(dbqJsonFeedJsObject);	
		    	//console.log('dbqJsonFeedStr='+dbqJsonFeedStr);
		    	var dbqJsonFeedValidOutputStr = getFileAsStr("./test/dataOut","dbqNotificationFeed_ValidDoc.json");
		    	dbqJsonFeedStr.should.equal(dbqJsonFeedValidOutputStr);
		    })
		  })
		  
		  describe('for the STR Notification JSON Feed', function() {	    	
	    	var strJsonDocContentStr = getFileAsStr("./test/dataIn","STR.json");
			//console.log("strJsonDocContentStr = "+strJsonDocContentStr);		
			
			var docContentDesc = 'STR';  
			var docId="4321abcd4321abcd4321abcd";
			var docUploadDate="2012-08-09T16:27:38-05:00";
			
			var strJsonFeedJsObject = feedTransformer.niemDocToJsonFeed(strJsonDocContentStr, docContentDesc, docId, docUploadDate);
			
		    it('should return this expected value when given an STR JSON input document with one link', function() {		    	
		    	var strJsonFeedStr = JSON.stringify(strJsonFeedJsObject);	
		    	//console.log('strJsonFeedStr='+strJsonFeedStr);
		    	var strJsonFeedValidOutputStr = getFileAsStr("./test/dataOut","strNotificationFeed_ValidDoc.json");
		    	strJsonFeedStr.should.equal(strJsonFeedValidOutputStr);
		    })
		  })	  
	});
    
 
	function getFileAsStr(dirname,filename) {
		//var dirname = "./test/dataIn"; 
		var filepath = dirname + '/'+filename;	
		//console.log("loading file at: "+filepath);
		var data = fs.readFileSync(filepath);
		return data.toString();
	} 
    
