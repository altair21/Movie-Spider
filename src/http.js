import request from 'request';

const get = (url, param = {}) => new Promise((resolve, reject) => {
  const paramStr = Object.keys(param).map(key => `${key}=${param[key]}`).join('&');
  const seprator = paramStr.length > 0 ? '?' : '';
  const reqStr = `${url}${seprator}${paramStr}`;

  request(reqStr, (err, response, body) => {
    if (err) reject(err);
    else resolve(body);
  });
});

export { get };
