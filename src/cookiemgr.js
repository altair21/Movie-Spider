
const objectFromCookie = (str = '') =>
str.split(';')
  .map(s => s.trim())
  .filter(s => s !== '')
  .reduce((obj, s) => {
    const arr = s.split('=');
    obj[arr[0]] = arr[1]; // eslint-disable-line no-param-reassign
    return obj;
  }, {});

const cookieFromObject = (obj = {}) => Object.keys(obj).reduce((str, key) =>
(str === '' ? `${key}=${obj[key]}` : `${str}; ${key}=${obj[key]}`), '');

class CookieMgr {
  constructor() {
    this.cookieStr = null;
    this.cookie = null;
  }

  hasCookie() {
    if (this.cookie) return true;
    return false;
  }

  setCookie(cookie) {
    this.cookieStr = cookie;
    this.cookie = objectFromCookie(cookie);
  }

  getCookie() {
    return cookieFromObject(this.cookie);
  }

  updateCookie(cookie) {
    const newCookie = objectFromCookie(cookie);
    this.cookie = {
      ...this.cookie,
      ...newCookie,
    };
    this.cookieStr = cookieFromObject(this.cookie);
  }
}
const cookieMgr = new CookieMgr();

export { cookieMgr };
