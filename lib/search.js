'use strict';

const R = require('ramda');
const common = require('./common');
const BASE_URL = 'https://search.itunes.apple.com/WebObjects/MZStore.woa/wa/search?clientApplication=Software&media=software&term=';

// TODO find out if there's a way to filter by device
// TODO refactor to allow memoization of the first request

function paginate (num, page) {
  num = num || 50;
  page = page - 1 || 0;
  const pageStart = num * page;
  const pageEnd = pageStart + num;
  return R.slice(pageStart, pageEnd);
}

function search (opts) {
  return new Promise(function (resolve, reject) {
    if (!opts.term) {
      throw Error('term is required');
    }
    const url = BASE_URL + encodeURIComponent(opts.term);
    const storeId = common.storeId(opts.country);
    const lang = opts.lang || 'en-us';
    // The platformId is not well documented but this is what
    // I have gathered so far and will be digging in more as I have time
    /*
    {
      K7: 20,  // iPad
      P7: 21,  // iPhone
      K71: 23, // iPad
      P71: 24, // iPhone
      K8: 25,  // iPad
      P8: 26,  // iPhone
      P84: 29, // iPhone
      K84: 30, // iPad
      Android: 31,
      Watch: 35,
      MacPodcasts1: 38
    }
    */
    const platformId = opts.platform === 'ipad' ? 25 : 24;
    common.request(
      url,
      {
        'X-Apple-Store-Front': `${storeId},${platformId} t:native`,
        'Accept-Language': lang
      },
      opts.requestOptions
    )
      .then(JSON.parse)
      .then((response) => {
        return (response.bubbles && response.bubbles.length > 0 && response.bubbles[0].results) || (response.pageData && response.pageData.bubbles.length > 0  && response.pageData.bubbles[0].results) || []
      })
      .then(paginate(opts.num, opts.page))
      .then(R.pluck('id'))
      .then((ids) => {
        if (!opts.idsOnly) {
          return common.lookup(ids, 'id', opts.country, opts.lang, opts.requestOptions, opts.throttle);
        }
        return ids;
      })
      .then(resolve)
      .catch(reject);
  });
}

module.exports = search;
