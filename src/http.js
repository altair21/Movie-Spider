import https from 'https';
import URL from 'url';

const hostname = 'movie.douban.com';

const login = (username, password) => new Promise((resolve, reject) => {
  const postBody = JSON.stringify({
    form_email: username,
    form_password: password,
  });

  const option = {
    hostname: 'accounts.douban.com',
    path: '/login',
    method: 'POST',
    timeout: 60 * 1000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postBody),
    },
  };

  const request = https.request(option, (res) => {
    const ret = [];
    res.on('data', (data) => {
      ret.push(data);
    });
    res.on('end', () => resolve(Buffer.concat(ret)));
    res.on('error', e => reject(new Error(`登录失败！\n${e.message}`)));
  }).on('error', e => reject(new Error(`登录失败！\n${e.message}`)));
  request.write(postBody);
  request.end();
});

const getText = (url, param = {}) => new Promise((resolve, reject) => {
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

const getBuffer = url => new Promise((resolve, reject) => {
  https.get(URL.parse(url), (response) => {
    const chunks = [];
    response.on('data', (chunk) => {
      chunks.push(chunk);
    }).on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', e => reject(new Error(`url: ${url}\n${e.message}`)));
  }).on('error', e => reject(new Error(`url ${url}\n${e.message}`)));
});

export { login, getText, getBuffer };
