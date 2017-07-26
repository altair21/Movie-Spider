import https from 'https';

const hostname = 'movie.douban.com';

const get = (url, param = {}) => new Promise((resolve, reject) => {
  const paramStr = Object.keys(param).map(key => `${key}=${param[key]}`).join('&');
  const seprator = paramStr.length > 0 ? '?' : '';
  const reqStr = `${url}${seprator}${paramStr}`;

  const option = {
    hostname,
    path: reqStr,
    method: 'GET',
    timeout: 60 * 1000,
  };

  https.get(option, (res) => {
    const ret = [];
    res.on('data', (data) => {
      ret.push(data);
    });
    res.on('end', () => resolve(ret.join('\n')));
    res.on('error', e => reject(new Error(`url: ${url}\n${e.message}`)));
  }).on('error', e => reject(new Error(`url ${url}\n${e.message}`)));
});

export { get };
