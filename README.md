# dataLayer_documentor
Scrape a website using Selenium for Data Layer, Adobe Page views and Google Page views, then create a CSV out of the data

1. From a CSV file list of URLs i.e, https://www.<BRAND>.com/US/en_US/
2. Get the data layer on page view i.e., `window.dataLayer1`
3. Get the data layer on page view i.e., `window.dataLayer2`
4. Get the Adobe Analytics & Google Analytics page view request (or anything else available on page view) i.e., `window.performance.getEntriesByType('resource')`;
5. Create a CSV with a list of URLs, and their DL and AA data