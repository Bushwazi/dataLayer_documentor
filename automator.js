/*
  Cache out NPM modules
*/
const csv = require('csvtojson'),
	fs = require('fs'),
	util = require('util'),
	json2csv = require('json2csv').parse,
	webdriver = require('selenium-webdriver'),
	By = webdriver.By,
	until = webdriver.until,
	logging = webdriver.logging,
	chrome = require('chromedriver'),
	firefox = require('selenium-webdriver/firefox');

/*
  cache our variables
*/
let theUrls = './_in/<FILE_NAME>.csv',
    newCSV = null,
    urlList = [],
    scrapeJSON = [],
    newCSVHeaders = ["Site Section","Page", "URL", "dataLayer1", "dataLayer2", "Adobe Requests", "Google Requests"],
    csvHeaders = { newCSVHeaders };

/*
  CSV reader
*/
let readTheUrls = ()=>{
	/*
		Read the theUrls CSV file and pull the URLs from it
		• `tempLimiter` is used to not run every URL (700+) during testing, remove it for a full test
	*/
	let tempLimiter = 0;
	csv()
		.fromFile(theUrls)
		.on('json',(jsonObj)=>{
			if(jsonObj['URL'].length > 0){
				urlList.push( {
					site_section: jsonObj['Site Section'] || "",
					page: jsonObj['Page'] || "",
					url: jsonObj['URL'] || ""
				});
			}
		})
		.on('done', (err)=>{
			if (err) throw err;
			// console.log(urlList);
			queryTheDom();
		});
}

let queryTheDom = () => {
	/*
		Start a chromedriver instance
	*/
	let driver = new webdriver.Builder()
	    .forBrowser('chrome')
	    .setChromeOptions()
	    .setFirefoxOptions()
	    .build();
	/*
		Loop thru the URL List, quit the driver at the end
	*/
	let urlIndex = 0,
		urlsLength = urlList.length,
		domScript = null;

	let runUrl = (urlIndex) => {
		console.log("[" + (urlIndex + 1) + "/" + urlList.length + "]", urlList[urlIndex].url)
		// console.log(csvHeaders);
		// console.log(scrapeJSON);
		/*
			Point driver to the URL
		*/
		driver.get( `${urlList[urlIndex].url}?dataLayer2_debug=1` ).then(()=>{
			// console.log(`URL: ${urlList[urlIndex].url}?dataLayer2_debug=1`);
			let urlRow = {
				"Site Section":urlList[urlIndex].site_section,
				"Page":urlList[urlIndex].page,
				"URL": urlList[urlIndex].url,
				"dataLayer1": null,
				"dataLayer2": null,
				"Adobe Requests": null,
				"Google Requests": null
			};
			driver.wait(webdriver.until.elementLocated({tagName:"body"})).then( ()=>{
				// console.log("BODY LOCATED");
				driver.executeScript( scrapeThatDOM ).then( (theScrape) => {
					// console.log("scrapeThatDOM");
					let cleanScrape = JSON.parse(theScrape);
					urlRow["dataLayer1"] = (cleanScrape.dataLayer1 || "").replace(/\"\,\"/g, '",\n"');
					urlRow["dataLayer2"] = (cleanScrape.dataLayer2 || "").replace(/\"\,\"/g, '",\n"');
					urlRow["Adobe Requests"] = decodeURIComponent(cleanScrape.adobe_requests.join(", ") || "").replace(/\&|\?/g, "\n");
					urlRow["Google Requests"] = decodeURIComponent(cleanScrape.google_requests.join(", ") || "").replace(/\&|\?/g, "\n");
					// console.log(typeof urlRow["dataLayer1"], urlRow["dataLayer1"]);
					// console.log(typeof urlRow["Adobe Requests"], urlRow["Adobe Requests"]);
					scrapeJSON.push(urlRow);
					urlIndex++;
					// console.log( "urlIndex", urlIndex, "urlsLength", urlsLength );
					if( urlIndex + 1 <= urlsLength ){
						runUrl(urlIndex);
					} else {
						driver.quit();
						/*
							Create a document of the results
						*/
						try {
							// console.log(scrapeJSON);
						  	buildCSV();
						} catch (err) {
						  	console.error(err);
						}
					}
				}).catch(err => { console.log("scrapeThatDOM", err); buildCSV(); });
			}).catch(err => { console.log("find the body", err); buildCSV(); });
		}).catch(err => { console.log("page load", err); buildCSV(); });
	}
	runUrl(urlIndex);
}

let buildCSV = () => {
  	newCSV = json2csv(scrapeJSON, csvHeaders);
	createFile(newCSV, "./_out/brand_scrape.csv");
}

let scrapeThatDOM = () => {
	let returnData = {
		dataLayer1: "",
		dataLayer2: "",
		adobe_requests: [],
		google_requests: []
	};
	if(window && window.hasOwnProperty("dataLayer1")){
		returnData.dataLayer1 = JSON.stringify(window.dataLayer1);
	}
	if(window && window.hasOwnProperty("dataLayer2")){
		returnData.dataLayer2 = JSON.stringify(window.dataLayer2);
	}
	returnData.google_requests = (window.performance.getEntriesByType('resource').filter( entry => {
		return /collect\?/i.test(entry.name);
	})).map( entry => { return entry.name } );
	returnData.adobe_requests = (window.performance.getEntriesByType('resource').filter(function(entry){
		return /b\/ss/i.test(entry.name);
	})).map( entry => { return entry.name } );
	return JSON.stringify(returnData);
}


let createFile = (thisData, fileName)=>{
  fs.writeFile(fileName, thisData, (err) => {
    if (err) throw err;
    console.log(fileName + ' has been saved!');
  });
}

readTheUrls();