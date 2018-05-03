/*

先跑 `npm run nightmare`

*/

import fs from 'fs';
import path from 'path';
import _ from 'lodash';

const allPath = path.join(__dirname, '..', 'output', 'all.json');
const fullPath = path.join(__dirname, '..', 'output', 'full_output.json');
const filterPath = path.join(__dirname, '..', 'output', 'filter.json');
const all = JSON.parse(fs.readFileSync(allPath, 'utf8'));
const full = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
const filter = fs.existsSync(filterPath) ? JSON.parse(fs.readFileSync(filterPath, 'utf8')) : [];

const checkIntegrity = () => {
  let remainArr = _.filter(all, (o) => !_.find(full, (v) => o.url.endsWith(v.url)));
  remainArr = _.filter(remainArr, (o) => !_.find(filter, (v) => o.url === v.url));

  const res = [];
  remainArr.forEach((val) => {
    res.push(val);
    console.log(val.name);
  });
  fs.writeFileSync(path.join(__dirname, '..', 'output', 'remain.json'), JSON.stringify(res), 'utf-8');
  console.log(`未添加的影片共计 ${res.length} 部`);
};

checkIntegrity();
