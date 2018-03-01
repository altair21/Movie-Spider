import fs from 'fs';
import path from 'path';

const year = (new Date()).getFullYear();

const sortFun = (a, b) => {
  const month = (str) => str.substr(5, 2);
  const day = (str) => str.substr(8, 2);
  if (month(a.releaseDate) === month(b.releaseDate)) {
    return day(a.releaseDate) - day(b.releaseDate);
  }
  return month(a.releaseDate) - month(b.releaseDate);
};

(async () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const outputPath = path.join(__dirname, '..', 'output', 'cinemafilm.txt');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8')).filter(o => !o.isManual && o.releaseDate && o.releaseDate.length > 0);
  const domestic = [];  // 国产片
  const introduced = [];  // 引进片

  origin.forEach((obj) => {
    // 下面这个正则不起作用，不知何故
    // const reg = new RegExp(`${year}-\\d{2}-\\d{2}(\\u4e2d\\u56fd\\u5927\\u9646)`, 'u');
    for (let i = 0, l = obj.releaseDate.length; i < l; i++) {
      if (obj.releaseDate[i].indexOf(year) !== -1
        && obj.releaseDate[i].indexOf('中国大陆') !== -1
        && obj.releaseDate[i].length === 16) {
        const newObj = {
          ...obj,
          releaseDate: obj.releaseDate[i].substr(0, 10),
        };
        if (obj.country.indexOf('中国大陆') !== -1) {
          domestic.push(newObj);
        } else {
          introduced.push(newObj);
        }
        break;
      }
    }
  });

  const text = [];
  text.push(`${year} 年的院线片`);
  text.push(`国产片共 ${domestic.length} 部：`);
  domestic.sort(sortFun).forEach(obj => text.push(`《${obj.name}》 上映时间：${obj.releaseDate} 导演：${obj.director.join('、')} 标记日期：${obj.markDate}`));
  text.push('');

  text.push(`引进片共 ${introduced.length} 部：`);
  introduced.sort(sortFun).forEach(obj => text.push(`《${obj.name}》 上映时间：${obj.releaseDate} 导演：${obj.director.join('、')} 标记日期：${obj.markDate}`));

  fs.writeFileSync(outputPath, text.join('\n'), 'utf8');
})();
