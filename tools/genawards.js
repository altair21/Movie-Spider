import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { mkdir, openFilmOrigin } from '../src/util/';

const keyAwards = [
  {
    name: '戛纳电影节',
    keywords: [
      {
        name: '金棕榈奖',
        nomination: true,
      },
      {
        name: '主竞赛单元 最佳导演',
        nomination: false,
      },
      {
        name: '主竞赛单元 评审团大奖',
        nomination: false,
      },
      {
        name: '一种关注单元 一种关注大奖',
        nomination: true,
      },
      {
        name: '一种关注单元 最佳导演',
        nomination: false,
      },
    ],
  },
  {
    name: '柏林国际电影节',
    keywords: [
      {
        name: '金熊奖',
        nomination: true,
      },
      {
        name: '最佳导演',
        nomination: false,
      },
      {
        name: '评审团大奖',
        nomination: false,
      },
    ],
  },
  {
    name: '威尼斯电影节',
    keywords: [
      {
        name: '金狮奖',
        nomination: true,
      },
      {
        name: '最佳导演',
        nomination: false,
      },
      {
        name: '评审团大奖',
        nomination: false,
      },
      {
        name: '地平线单元',
        nomination: true,
      },
    ],
  },
  {
    name: '奥斯卡金像奖',
    keywords: [
      {
        name: '最佳影片',
        nomination: true,
      },
      {
        name: '最佳导演',
        nomination: true,
      },
      {
        name: '最佳外语片',
        nomination: true,
      },
    ],
  },
  {
    name: '香港电影金像奖',
    keywords: [
      {
        name: '最佳电影',
        nomination: true,
      }, {
        name: '最佳导演',
        nomination: true,
      },
    ],
  },
  {
    name: '台北金马影展',
    keywords: [
      {
        name: '最佳剧情片',
        nomination: true,
      }, {
        name: '最佳导演',
        nomination: true,
      },
    ],
  },
];

const findAwards = () => {
  const origin = openFilmOrigin(true, o => o.awards && o.awards.length > 0);

  const res = [];
  keyAwards.forEach(keyAward => {
    res[keyAward.name] = {};
    keyAward.keywords.forEach(keyword => {
      res[keyAward.name][keyword.name] = [];
    });
  });

  origin.forEach(obj => {
    keyAwards.forEach(keyAward => {
      const finded = _.find(obj.awards, (aw) => aw.name.indexOf(keyAward.name) !== -1);
      if (!finded) return;
      keyAward.keywords.forEach(keyword => {
        const findedAw = _.find(finded.awards, (award) => award.name.indexOf(keyword.name) !== -1);
        if (!findedAw) return;
        const newObj = {
          name: obj.name,
          director: obj.director.map(o => o.name),
          ceremony: finded.name,
          year: finded.year,
          award: findedAw.name,
          honoree: findedAw.honoree,
        };
        res[keyAward.name][keyword.name].push(newObj);
      });
    });
  });
  return res;
};

const getStatisticsText = (res) => {
  const text = [];

  keyAwards.forEach(keyAward => {
    text.push(`${keyAward.name}`);
    keyAward.keywords.forEach(keyword => {
      const winning = res[keyAward.name][keyword.name]
        .filter(obj => obj.award.indexOf('提名') === -1)
        .sort((a, b) => a.year - b.year);
      const nominate = res[keyAward.name][keyword.name]
        .filter(obj => obj.award.indexOf('提名') !== -1)
        .sort((a, b) => a.year - b.year);
      text.push(`“${keyword.name}”，获奖作品 ${winning.length} 个${keyword.nomination ? `，提名作品 ${nominate.length} 个` : ''}`);
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
  return text.join('\n');
};

const doAwards = () => {
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);

  const text = getStatisticsText(findAwards());
  const outputPath = path.join(outputDir, 'award.txt');
  fs.writeFileSync(outputPath, text, 'utf8');
};

doAwards();

export { findAwards, keyAwards };
