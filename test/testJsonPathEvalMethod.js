var feedTransformer = require('../lib/feedTransformer.js');

exports.getJsonPathResult = util = function(jsObj, exprStr) {
	var resultArr = jsonpath.eval(jsObj, exprStr);
	console.log('resultArr.length='+resultArr.length);
	if (resultArr.length) {
	//if(Object.prototype.toString.call(resultArr) === '[object Array]') {
		console.log('resultArr.length had a value.');	
		resultJsObj = resultArr;
	} else {
		console.log('resultArr.length FAILED.');
		resultJsObj = resultArr;
	}
	return resultJsObj;
}

describe('getJsonPathResult()', function() {
	it('should return an expected result', function() {	
		
		var testJsObj = {
				"title":"Attachment",
				"type":"image/jpeg",			
				"href":"https://localhost:3002/core/fs/abcd1234abcd1234abcd1235"};
		
		var multipleItemJsObj = { "nc:DocumentIdentification": 
			[
	          { "nc:IdentificationID": "D3062F64-BCA2-4347-A6ED-94CADDD68852" },
	          {
	            "nc:IdentificationID": "1232432423",
	            "nc:IdentificationCategoryText": "VTA Tracking Identifier",
	            "nc:IdentificationCategoryDescriptionText": "string"
	          },
	          {
	            "nc:IdentificationID": "23423432",
	            "nc:IdentificationCategoryText": "eCFT Case ID",
	            "nc:IdentificationCategoryDescriptionText": "string"
	          }
	        ]
		};
		
		var emptyKeyJsObj = {"empty":""};
		
		var emptyJsObj = {};
		
		var nullVar = null;
		
		var emptyStr = "";
		
		var blankStr = "   ";
		
		// case 1. multipleItemJsObj, exprStr = "$..nc:IdentificationID", returns an array of 3 str items with only nc:IdentificationID values in each
		// case 2. multipleItemJsObj, exprStr = "$..nc:DocumentIdentification", returns an 2-d array: one outer with an inner array of 3 JS objects, which are the 3 child JS objects of nc:DocumentIdentification
		// case 3. multipleItemJsObj, exprStr = "$..nc:IdentificationCategoryText", returns an array of 2 str items with only nc:IdentificationID values in each
		// case 4. multipleItemJsObj, exprStr = "$..nothing", returns an empty array, .length=0
		// case 5. testJsObj, exprStr = "$..title", returns an array of 1 str item, with only the value of "title" in it, .length=1
		// case 6. emptyJsObj, exprStr = "$..nothing", returns an empty array, .length=0
		// case 7. nullVar, exprStr = "$..nothing", returns undefined, .length throws 'TypeError: Cannot read property 'length' of undefined'
		// case 8. emptyStr, exprStr = "$..nothing", returns undefined
		// case 9. blankStr, exprStr = "$..nothing", returns undefined
		// case 10. blankStr, exprStr = "$..empty", returns a 1 item array of 1 empty string in it, .length is 1
		
		var resultJsObject = util.getJsonPathResult(multipleItemJsObj, "$..nc:IdentificationID");
		console.log('resultJsObject='+resultJsObject);
		console.log('resultJsObject str='+JSON.stringify(resultJsObject));
		
		//var jsonFeedOneEntryTwoLinksStr = JSON.stringify(jsonFeedOneEntryTwoLinksJsObject);
		//console.log('jsonFeedOneEntryTwoLinksStr='+jsonFeedOneEntryTwoLinksStr);
		//var oneEntryTwoLinksValidOutputStr = getFileAsStr("./test/dataOut","oneEntryTwoLinks_simpleTestContent_ValidOutput.json");				
		//jsonFeedOneEntryTwoLinksStr.should.equal(oneEntryTwoLinksValidOutputStr);	
    })
});