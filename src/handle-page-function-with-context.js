const Apify = require('apify');

const { safeMatch, parseCategoryId, createUrlFromId, pushCategory, findTitleInOrder } = require('./utils.js');

// We export a function with a context for convenience
module.exports = (context) => async ({ $, request, html }) => {
    const {
        depthRange,
        requestQueue,
        onlyDirect,
    } = context;

    const title = $('title').text();

    if (title.toLowerCase().includes('robot check')) {
        throw new Error(`CAPTCHA n. ${request.retryCount + 1} --- ${request.url}`);
    }

    const thisId = parseCategoryId(request.url);

    const titleSelectors = [
        '#leftNav h4.a-text-bold',
        '#fst-hybrid-dynamic-h1 h1',
        '.bxw-pageheader__title__text h1',
        '#searchDropdownBox option[selected]',
    ];
    const thisTitle = findTitleInOrder($, titleSelectors);
    const thisDepth = request.userData.depth || 0;
    const thisReferrer = request.userData.referrer;

    await Apify.setValue(thisId, html, { contentType: 'text/html' });

    const thisPage = {
        url: createUrlFromId(thisId),
        id: thisId,
        title: thisTitle,
        depth: thisDepth,
    };

    const parents = [];
    const children = [];

    // TRADITIONAL NAV (up and down)
    // children
    $('#leftNav ul')
        .eq(0)
        .find('.a-text-bold')
        .parents('li')
        .next()
        .find('li')
        .each(function () {
            const id = parseCategoryId($(this).find('a').attr('href'));
            const title = $(this).text().trim();
            // console.log(`parsing child from TRADITIONAL NAV: ${id}, title: ${title}`);
            pushCategory(children, id, title);
        });
    // parents
    $('#leftNav ul')
        .eq(0)
        .find('.a-text-bold')
        .parents('li')
        .siblings('li')
        .each(function () {
            const id = parseCategoryId($(this).find('a').attr('href'));
            const title = $(this).text().trim();
            //  console.log(`parsing parent from TRADITIONAL NAV --- id: ${id}, title: ${title}`);
            pushCategory(parents, id, title);
        });

    // BIG NAV (only children)
    $('.left_nav.browseBox a').each(function () {
        const id = parseCategoryId($(this).attr('href'));
        const title = $(this).text().trim();
        //  console.log(`parsing children from BIG NAV --- id: ${id}, title: ${title}`);
        pushCategory(children, id, title);
    })

    // NEAR PRODUCTS NAV (1-24 of over 50,000 results for) (only parents)
    $('#s-result-count a').each(function () {
        const id = parseCategoryId($(this).attr('href'));
        const title = $(this).text().trim();
        //  console.log(`parsing children from PRODUCTS NAV --- id: ${id}, title: ${title}`);
        pushCategory(parents, id, title);
    });

    /*
    $('.octopus-pc-category-card-v2-category-link').each(function () {
        const id = parseCategoryId($(this).attr('href'));
        const categoryItem = {
            title: $(this).text().trim(),
            id,
            url: createUrlFromId(id),
        };
        children.push(children, categoryItem);
    });
    */

    const maybeMinimumProductsString = safeMatch($('#s-result-count').text(), /over ((?:\d|,)+) results/);
    const maybeMinimumProducts = maybeMinimumProductsString
        ? Number(maybeMinimumProductsString.replace(/,/g, ''))
        : null;

    const links = children
        .map((item) => ({ ...item, type: 'child' }))
        .concat(parents.map((item) => ({ ...item, type: 'parent' })));


    let childrenEnqueued = 0;
    let parentsEnqueued = 0;
    for (const link of links) {
        // We check if thew new depth of each item is within the range
        const newDepth = link.type === 'child' ? thisDepth + 1 : thisDepth - 1;
        const isWithinRange = newDepth >= depthRange[0] && newDepth <= depthRange[1];
        if (isWithinRange) {
            if (onlyDirect && thisReferrer) {
                const isDirect = link.type === 'child'
                    ? thisReferrer.depth < thisDepth < newDepth
                    : thisReferrer.depth > thisDepth > newDepth;
                if (!isDirect) {
                    continue;
                }
            }
            await requestQueue.addRequest({
                url: link.url,
                userData: {
                    depth: newDepth,
                    referrer: thisPage,
                },
            });
            if (link.type === 'child') {
                childrenEnqueued++;
            } else {
                parentsEnqueued++;
            }
        }
    }

    console.log(`DEPTH: ${thisDepth} --- ${thisTitle} --- FOUND: parents: ${parents.length}, children: ${children.length} --- ENQUEUED: parents: ${parentsEnqueued}, children: ${childrenEnqueued} --- ${request.url}`);

    await Apify.pushData({
        url: request.url,
        title: thisTitle,
        minimumProducts: maybeMinimumProducts,
        parents,
        children,
        referrer: request.userData.referrer,
        depth: thisDepth,
    });
};
