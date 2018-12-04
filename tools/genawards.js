import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { mkdir, openFilmOrigin } from '../src/util/';

const keyAwards = [
  {
    name: '戛纳电影节',
    keywords: ['金棕榈奖', '主竞赛单元 最佳导演', '主竞赛单元 评审团大奖', '一种关注单元 一种关注大奖', '一种关注单元 最佳导演'],
  },
  {
    name: '柏林国际电影节',
    keywords: ['金熊奖', '最佳导演', '评审团大奖'],
  },
  {
    name: '威尼斯电影节',
    keywords: ['金狮奖', '最佳导演', '评审团大奖', '地平线单元'],
  },
  {
    name: '奥斯卡金像奖',
    keywords: ['最佳影片', '最佳导演'],
  },
  {
    name: '香港电影金像奖',
    keywords: ['最佳电影', '最佳导演'],
  },
  {
    name: '台北金马影展',
    keywords: ['最佳剧情片', '最佳导演'],
  },
];

(async () => {
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);
  const outputPath = path.join(outputDir, 'award.txt');
  const origin = openFilmOrigin(true, o => o.awards && o.awards.length > 0);

  const text = [];
  const res = [];
  keyAwards.forEach(keyAward => {
    res[keyAward.name] = {};
    keyAward.keywords.forEach(keyword => {
      res[keyAward.name][keyword] = [];
    });
  });

  origin.forEach(obj => {
    keyAwards.forEach(keyAward => {
      const finded = _.find(obj.awards, (aw) => aw.name.indexOf(keyAward.name) !== -1);
      if (!finded) return;
      keyAward.keywords.forEach(keyword => {
        const findedAw = _.find(finded.awards, (award) => award.name.indexOf(keyword) !== -1);
        if (!findedAw) return;
        const newObj = {
          name: obj.name,
          director: obj.director.map(o => o.name),
          ceremony: finded.name,
          year: finded.year,
          award: findedAw.name,
          honoree: findedAw.honoree,
        };
        res[keyAward.name][keyword].push(newObj);
      });
    });
  });

  keyAwards.forEach(keyAward => {
    text.push(`${keyAward.name}`);
    keyAward.keywords.forEach(keyword => {
      const winning = res[keyAward.name][keyword]
        .filter(obj => obj.award.indexOf('提名') === -1)
        .sort((a, b) => a.year - b.year);
      const nominate = res[keyAward.name][keyword]
        .filter(obj => obj.award.indexOf('提名') !== -1)
        .sort((a, b) => a.year - b.year);
      text.push(`“${keyword}”，获奖作品 ${winning.length} 个，提名作品 ${nominate.length} 个`);
      if (winning.length > 0) {
        text.push(winning.map((obj, idx) =>
          `${idx + 1}. ${obj.ceremony}(${obj.year}) ${obj.award} - 《${obj.name}》 ${obj.honoree.join('、')}`).join('\n'));
      }
      if (nominate.length > 0) {
        text.push(nominate.map((obj, idx) =>
          `${idx + 1}. ${obj.ceremony}(${obj.year}) ${obj.award} - 《${obj.name}》${obj.honoree.join('、')}`).join('\n'));
      }
      text.push('');
    });
    text.push('');
  });

  fs.writeFileSync(outputPath, text.join('\n'), 'utf8');
})();
