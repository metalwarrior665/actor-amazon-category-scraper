const Apify = require('apify');
const SessionsCheerioCrawler = require('./session-cheerio-crawler');
const handlePageFunctionWithContext = require('./handle-page-function-with-context.js');

const { parseCategoryId, createUrlFromId } = require('./utils.js');

// TODO: Add an option to limit number of results for each keyword
Apify.main(async () => {
    // Get queue and enqueue first url.
    const requestQueue = await Apify.openRequestQueue();
    const input = await Apify.getInput();
    const {
        categoryUrls,
        depthRange,
        proxyConfiguration = { useApifyProxy: true },
        maxConcurrency,
        maxRequestRetries,
        onlyDirect,
    } = input;

    for (const categoryUrl of categoryUrls) {
        const categoryId = parseCategoryId(categoryUrl);
        const url = createUrlFromId(categoryId);
        await requestQueue.addRequest({
            url,
            userData: {
                depth: 0,
            },
        });
    }

    // Create crawler.
    const crawler = new SessionsCheerioCrawler({
        requestQueue,
        maxConcurrency,
        useApifyProxy: proxyConfiguration.useApifyProxy,
        apifyProxyGroups: proxyConfiguration.apifyProxyGroups,
        handlePageTimeoutSecs: 2.5 * 60 * 1000,
        maxRequestRetries,
        autoscaledPoolOptions: {
            systemStatusOptions: {
                maxEventLoopOverloadedRatio: 0.8,
            },
            snapshotterOptions: {
                maxBlockedMillis: 200,
            },
        },
        handlePageFunction: handlePageFunctionWithContext({ requestQueue, depthRange, onlyDirect }),
    });

    // Run crawler.
    await crawler.run();
});
