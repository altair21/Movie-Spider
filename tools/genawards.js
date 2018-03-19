import fs from 'fs';
import path from 'path';
import _ from 'lodash';

const keyAwards = [
  {
    name: '戛纳电影节',
    keywords: ['金棕榈奖', '评审团大奖', '一种关注大奖'],
  },
  {
    name: '柏林国际电影节',
    keywords: ['金熊奖', '评审团大奖', '费比西奖'],
  },
  {
    name: '威尼斯电影节',
    keywords: ['金狮奖', '地平线单元'],
  },
  {
    name: '奥斯卡金像奖',
    keywords: ['最佳影片'],
  },
  {
    name: '香港电影金像奖',
    keywords: ['最佳电影'],
  },
  {
    name: '台北金马影展',
    keywords: ['最佳剧情片'],
  },
];

(async () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const outputPath = path.join(__dirname, '..', 'output', 'cinemafilm.txt');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'))
    .filter(obj => obj.awards && obj.awards.length > 0);

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
        const newObj = {
          name: obj.name,
          director: obj.director,
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
    text.push(`${keyAward}`);
    keyAward.keywords.forEach(keyword => {
      console.log(keyword)
      console.log(res[keyAward.name][keyword]);
      const nominate = res[keyAward.name][keyword]
        .filter(obj => obj.award.indexOf('提名') !== -1)
        .sort((a, b) => a.year - b.year);
      const winning = res[keyAward.name][keyword]
        .filter(obj => obj.award.indexOf('提名') === -1)
        .sort((a, b) => a.year - b.year);
      text.push(`${keyAward}，获奖作品 ${winning.length} 个，提名作品 ${nominate.length} 个`);
    });
    text.push('');
  });

  fs.writeFileSync(outputPath, JSON.stringify(text.join('、')), 'utf8');
})();
