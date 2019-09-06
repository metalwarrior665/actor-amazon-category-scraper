const REGEXES = {
    categoryDirect: /.*\/(?:b|s)(?:\/|\?).*node=(\d+)(?:&|\b)/,
    categoryStructuredFirst: /.*\/(?:b|s)(?:\/|\?).*rh=([^&]*)(?:&|\b)/,
    categoryStructuredSecond: /n:\d+/g,
};

module.exports.parseCategoryId = (url) => {
    const decodedUrl = decodeURIComponent(url);

    const matchDirect = decodedUrl.match(REGEXES.categoryDirect);
    if (matchDirect) {
        return matchDirect[1];
    }
    const matchStructuredFirst = decodedUrl.match(REGEXES.categoryStructuredFirst);
    if (matchStructuredFirst) {
        const categoriesString = matchStructuredFirst[1];
        const matchCategoriesString = categoriesString.match(REGEXES.categoryStructuredSecond);
        if (matchCategoriesString) {
            const lastCategory = matchCategoriesString[matchCategoriesString.length - 1];
            return lastCategory.replace('n:', '');
        }
    }
};

const createUrlFromId = (categoryId) => `https://www.amazon.com/b?node=${categoryId}`;
module.exports.createUrlFromId = createUrlFromId;

// Gives you match in the first bracket or undefined
module.exports.safeMatch = (string, regex, index = 1) => {
    const maybeMatch = string.match(regex);
    if (maybeMatch) {
        return maybeMatch[index];
    }
};

const pushUnique = (array, item) => {
    if (!array.find((arrItem) => arrItem.id === item.id)) {
        array.push(item);
    }
};

module.exports.pushCategory = (array, id, title) => {
    if (!id) {
        return;
    }
    const categoryItem = {
        title,
        id,
        url: createUrlFromId(id),
    };
    pushUnique(array, categoryItem);
};

module.exports.findTitleInOrder = ($, selectors) => {
    for (const selector of selectors) {
        const text = $(selector).eq(0).text().trim();
        if (text) {
            return text;
        }
    }
};
