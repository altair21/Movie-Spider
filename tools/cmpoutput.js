import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { PropertyPreset } from '../src/util/text';

(() => {
  if (process.argv.length !== 4) {
    console.log('参数不正确，需要传入两个文件路径');
    process.exit(-1);
  }
  const filePath1 = path.isAbsolute(process.argv[2]) ? process.argv[2] : path.join(process.cwd(), process.argv[2]);
  const filePath2 = path.isAbsolute(process.argv[3]) ? process.argv[3] : path.join(process.cwd(), process.argv[3]);

  const origin1 = JSON.parse(fs.readFileSync(filePath1, 'utf8'));
  const origin2 = JSON.parse(fs.readFileSync(filePath2, 'utf8'));

  if (origin1.length !== origin2.length) {
    console.log('文件内容不同');
    console.log(`文件 ${filePath1} 数组长度为 ${origin1.length}`);
    console.log(`文件 ${filePath2} 数组长度为 ${origin2.length}`);
    return 0;
  }

  let flag = true;
  for (let i = 0, l = origin1.length; i < l; i++) {
    const obj1 = origin1[i];
    const obj2 = _.find(origin2, (o) => o.id === obj1.id);
    if (obj2 != null) {
      flag = false;
      for (let j = 0, m = PropertyPreset.length; j < m; j++) {
        const key = PropertyPreset[j].name;
        if (!_.isEqual(obj1[key], obj2[key])) {
          console.log(`${obj1.name} 属性 ${key} 不同：${JSON.stringify(obj1[key])} vs ${JSON.stringify(obj2[key])}`);
        }
      }
      break;
    }
  }
  if (flag === true) {
    console.log('两个文件相同');
  }

  return 0;
})();
