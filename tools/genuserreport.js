/**
 * Author: altair21
 * Date: 2018.02.09
 * Description: 分析用户的打分分布，看片类型分布，恶评高分片、优评低分片。友邻打分和豆瓣均分对比等。
 * Output: Markdown File
 */

import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import {
  header, bold, disorderItem, italic, separator,
} from '../src/logger/markdown';
import { getDirectorResult } from './gendirector';
import { mkdir, openFilmOrigin } from '../src/util';

// -- Macro
const gapThreshold = 2.1;
const hasFriends = true;  // 是否生成友邻报告
const friendsNosThreshold = 5;  // 友邻评分人数小于这个值就不统计了

const h2 = header(2);

const textFromScore = (score) => {
  if (score === 1) return '一星';
  else if (score === 2) return '两星';
  else if (score === 3) return '三星';
  else if (score === 4) return '四星';
  else if (score === 5) return '五星';
  return '未评分';
};

const getLatestMarkDate = (str1, str2) => {
  const numberFromMarkDate = (str) => +`${str.substr(0, 4)}${str.substr(5, 2)}${str.substr(8, 2)}`;
  if (numberFromMarkDate(str1) > numberFromMarkDate(str2)) return str1;
  return str2;
};

const randomFilmName = (arr, num) => {
  if (arr.length < num) {
    return arr.map(obj => `《${obj.name}》(${obj.director.join('、')}, ${obj.year})`).join('、');
  }
  const rns = [];
  while (rns.length < num) {
    const rn = Math.floor(Math.random() * arr.length);
    if (rns.indexOf(rn) === -1) rns.push(rn);
  }

  const res = [];
  rns.forEach(index => res.push(`《${arr[index].name}》(${arr[index].director.join('、')}, ${arr[index].year})`));
  return res.join('、');
};

(async () => {
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);
  const outputPath = path.join(outputDir, 'user.md');
  const origin = openFilmOrigin(true);
  const category = [];  // 类型分布统计
  let totalScored = 0;  // 共为几部片打分
  const score = [0, 0, 0, 0, 0, 0]; // 打分0（未打分）~5星分布数量
  const noScoreFilms = [];  // 未打分的影片
  const text = [];  // 输出文本
  const badGap = [];  // 恶评高分片
  const goodGap = []; // 好评低分片
  const badGapWithFriends = []; // 恶评高分片（和友邻比）
  const goodGapWithFriends = [];  // 好评低分片（和友邻比）
  const friendsGoodGap = [];  // 友邻评分和豆瓣均分的差距
  const friendsBadGap = [];
  const watchedRuler = [5000, 50000, 100000, 200000]; // 依次为 小众、较为小众、普通、较为大众、大众
  const watchedDist = [[], [], [], [], []];
  let minScorePercFilm = { numberOfWatched: 1, numberOfScore: 1 };
  let maxScorePercFilm = { numberOfWatched: 1, numberOfScore: 0 };
  const directorRes = getDirectorResult()
    .filter(o => o.origFormat.length > 3)
    .map(o => ({
      ...o,
      origFormat: o.origFormat.filter(f => f.userScore > 0),
    }))
    .map(o => ({
      ...o,
      avgScore: (o.origFormat.reduce((total, f) => total + f.userScore, 0) / o.origFormat.length * 2).toFixed(2),
    }));

  let latestMarkDate;

  origin.filter(o => o.score >= 0).forEach((obj) => {
    // 【统计看片类别】
    if (obj.category) {
      obj.category.forEach((c) => {
        const findObj = _.find(category, o => o.category === c);
        if (findObj) {
          findObj.num++;
        } else {
          category.push({
            category: c,
            num: 1,
          });
        }
      });
    }

    // 【统计打分分布】
    if (typeof obj.userScore === 'number') {
      score[obj.userScore]++;
      if (obj.userScore > 0) totalScored++;
      else {
        noScoreFilms.push({
          name: obj.name,
          year: obj.year,
          director: obj.director.join('、'),
        });
      }
    }

    // 找到打分人数占比最大和最小的电影
    if (obj.numberOfScore > 0 && obj.numberOfWatched > 0
      && obj.numberOfScore / obj.numberOfWatched >
      maxScorePercFilm.numberOfScore / maxScorePercFilm.numberOfWatched) {
      maxScorePercFilm = obj;
    }
    if (obj.numberOfScore > 0 && obj.numberOfWatched > 0
      && obj.numberOfScore / obj.numberOfWatched <
      minScorePercFilm.numberOfScore / minScorePercFilm.numberOfWatched) {
      minScorePercFilm = obj;
    }

    // 恶评高分影片，取7.5分以上的电影
    if (obj.score - obj.userScore * 2 >= gapThreshold && obj.userScore > 0 && +obj.score >= 7.5) {
      badGap.push({
        name: obj.name,
        year: obj.year,
        director: obj.director.join('、'),
        userScore: obj.userScore,
        score: obj.score,
      });
    }

    // 恶评高分电影（和友邻比）
    if (hasFriends && obj.friendsNoS >= friendsNosThreshold
      && obj.friendsScore - obj.userScore * 2 >= gapThreshold
      && obj.userScore > 0 && +obj.friendsScore >= 7.5) {
      badGapWithFriends.push({
        name: obj.name,
        year: obj.year,
        director: obj.director.join('、'),
        friendsScore: obj.friendsScore,
        friendsNoS: obj.friendsNoS,
        userScore: obj.userScore,
      });
    }

    // 友邻恶评高分片
    if (hasFriends && obj.friendsNoS >= friendsNosThreshold
      && obj.score - obj.friendsScore >= gapThreshold && +obj.score >= 7.5) {
      friendsBadGap.push({
        name: obj.name,
        year: obj.year,
        director: obj.director.join('、'),
        score: obj.score,
        friendsScore: obj.friendsScore,
        friendsNoS: obj.friendsNoS,
      });
    }

    // 好评低分片，取7.5分以下的电影
    if (obj.userScore * 2 - obj.score >= gapThreshold && +obj.score < 7.5) {
      goodGap.push({
        name: obj.name,
        year: obj.year,
        director: obj.director.join('、'),
        userScore: obj.userScore,
        score: obj.score,
      });
    }

    // 好评低分电影（和友邻比）
    if (hasFriends && obj.friendsNoS >= friendsNosThreshold
      && obj.userScore * 2 - obj.friendsScore >= gapThreshold && +obj.friendsScore < 7.5) {
      goodGapWithFriends.push({
        name: obj.name,
        year: obj.year,
        director: obj.director.join('、'),
        friendsScore: obj.friendsScore,
        friendsNoS: obj.friendsNoS,
        userScore: obj.userScore,
      });
    }

    // 友邻好评低分片
    if (hasFriends && obj.friendsNoS >= friendsNosThreshold
      && obj.friendsScore - obj.score >= gapThreshold && +obj.score < 7.5) {
      friendsGoodGap.push({
        name: obj.name,
        year: obj.year,
        director: obj.director.join('、'),
        score: obj.score,
        friendsScore: obj.friendsScore,
        friendsNoS: obj.friendsNoS,
      });
    }

    if (typeof obj.markDate === 'string') {
      if (!latestMarkDate) latestMarkDate = obj.markDate;
      else latestMarkDate = getLatestMarkDate(latestMarkDate, obj.markDate);
    }
  });

  origin.forEach(obj => {
    let i = 0;
    for (let l = watchedRuler.length; i < l; i++) {
      if (obj.numberOfWatched < watchedRuler[i]) break;
    }
    watchedDist[i].push(obj);
  });

  // 输出
  text.push(h2('概况\n'));
  text.push(italic(`数据统计来自 ${origin.length} 部影片`));
  text.push(`根据标记记录截止至 ${latestMarkDate}`);
  text.push(separator());

  text.push(h2('类型分布\n'));
  category.sort((a, b) => b.num - a.num);
  category.forEach((co, index) => {
    text.push(`${index + 1}. ${co.category} 共计 ${co.num} 部`);
  });
  text.push(separator());

  text.push(h2('打分分布\n'));
  text.push(bold(`打分的电影有 ${totalScored} 部，占比 ${(totalScored / origin.length * 100).toFixed(3)}%`));
  if (noScoreFilms.length > 0) {
    text.push(bold(`未打分的电影共有 ${origin.length - totalScored} 部，占比 ${((origin.length - totalScored) / origin.length * 100).toFixed(3)}%`));
  }
  text.push(disorderItem(`五星电影：${score[5]} 部，占比 ${(score[5] / totalScored * 100).toFixed(2)}%`));
  text.push(disorderItem(`四星电影：${score[4]} 部，占比 ${(score[4] / totalScored * 100).toFixed(2)}%`));
  text.push(disorderItem(`三星电影：${score[3]} 部，占比 ${(score[3] / totalScored * 100).toFixed(2)}%`));
  text.push(disorderItem(`两星电影：${score[2]} 部，占比 ${(score[2] / totalScored * 100).toFixed(2)}%`));
  text.push(disorderItem(`一星电影：${score[1]} 部，占比 ${(score[1] / totalScored * 100).toFixed(2)}%`));
  if (noScoreFilms.length > 0) {
    text.push('\n未打分影片：');
    noScoreFilms.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})`);
    });
  }
  text.push(separator());

  text.push(h2('这些导演你看的最多'));
  text.push(disorderItem(`${directorRes[0].name} 共看过 ${directorRes[0].long.length} 部长片`));
  text.push(disorderItem(`${directorRes[1].name} 共看过 ${directorRes[1].long.length} 部长片`));
  text.push(disorderItem(`${directorRes[2].name} 共看过 ${directorRes[2].long.length} 部长片`));
  text.push(disorderItem(`${directorRes[3].name} 共看过 ${directorRes[3].long.length} 部长片`));
  text.push(disorderItem(`${directorRes[4].name} 共看过 ${directorRes[4].long.length} 部长片`));
  text.push(separator());

  let sortedDirectors = directorRes.sort((a, b) => b.avgScore - a.avgScore);
  text.push(h2('这些导演你很偏爱'));
  text.push(italic('仅统计你看过的作品数量多于三部的导演'));
  text.push(disorderItem(`${sortedDirectors[0].name} ${sortedDirectors[0].origFormat.length} 部作品，你平均打出了 ${sortedDirectors[0].avgScore} 分`));
  text.push(disorderItem(`${sortedDirectors[1].name} ${sortedDirectors[1].origFormat.length} 部作品，你平均打出了 ${sortedDirectors[1].avgScore} 分`));
  text.push(disorderItem(`${sortedDirectors[2].name} ${sortedDirectors[2].origFormat.length} 部作品，你平均打出了 ${sortedDirectors[2].avgScore} 分`));
  text.push(disorderItem(`${sortedDirectors[3].name} ${sortedDirectors[3].origFormat.length} 部作品，你平均打出了 ${sortedDirectors[3].avgScore} 分`));
  text.push(disorderItem(`${sortedDirectors[4].name} ${sortedDirectors[4].origFormat.length} 部作品，你平均打出了 ${sortedDirectors[4].avgScore} 分`));
  text.push(separator());

  sortedDirectors = directorRes.sort((a, b) => a.avgScore - b.avgScore);
  text.push(h2('你对这些导演翻白眼'));
  text.push(italic('仅统计你看过的作品数量多于三部的导演'));
  text.push(disorderItem(`${sortedDirectors[0].name} ${sortedDirectors[0].origFormat.length} 部作品，你平均打出了 ${sortedDirectors[0].avgScore} 分`));
  text.push(disorderItem(`${sortedDirectors[1].name} ${sortedDirectors[1].origFormat.length} 部作品，你平均打出了 ${sortedDirectors[1].avgScore} 分`));
  text.push(disorderItem(`${sortedDirectors[2].name} ${sortedDirectors[2].origFormat.length} 部作品，你平均打出了 ${sortedDirectors[2].avgScore} 分`));
  text.push(disorderItem(`${sortedDirectors[3].name} ${sortedDirectors[3].origFormat.length} 部作品，你平均打出了 ${sortedDirectors[3].avgScore} 分`));
  text.push(disorderItem(`${sortedDirectors[4].name} ${sortedDirectors[4].origFormat.length} 部作品，你平均打出了 ${sortedDirectors[4].avgScore} 分`));
  text.push(separator());

  text.push(h2('打分人数占比'));
  text.push(`在你看过的电影里面，${maxScorePercFilm.director.join('、')} 执导的 《${maxScorePercFilm.name}》(${maxScorePercFilm.year}) 打分人数在看过人数中的占比最高（${(maxScorePercFilm.numberOfScore / maxScorePercFilm.numberOfWatched * 100).toFixed(2)}%）`);
  text.push(`在你看过的电影里面，${minScorePercFilm.director.join('、')} 执导的 《${minScorePercFilm.name}》(${minScorePercFilm.year}) 打分人数在看过人数中的占比最低（${(minScorePercFilm.numberOfScore / minScorePercFilm.numberOfWatched * 100).toFixed(2)}%）`);
  text.push(separator());

  text.push(h2('大众、小众分布'));
  text.push(italic('按照影片看过的人数将影片分为“大众”和“小众”：'));
  text.push(disorderItem(`小众（看过人数 < ${watchedRuler[0]}）：${(watchedDist[0].length / origin.length * 100).toFixed(2)}%（${randomFilmName(watchedDist[0], 3)} 等）`));
  text.push(disorderItem(`较为小众（看过人数 ${watchedRuler[0]} ~ ${watchedRuler[1]}）：${(watchedDist[1].length / origin.length * 100).toFixed(2)}%（${randomFilmName(watchedDist[1], 3)} 等）`));
  text.push(disorderItem(`一般（看过人数 ${watchedRuler[1]} ~ ${watchedRuler[2]}）：${(watchedDist[2].length / origin.length * 100).toFixed(2)}%（${randomFilmName(watchedDist[2], 3)} 等）`));
  text.push(disorderItem(`较为大众（看过人数 ${watchedRuler[2]} ~ ${watchedRuler[3]}）：${(watchedDist[3].length / origin.length * 100).toFixed(2)}%（${randomFilmName(watchedDist[3], 3)} 等）`));
  text.push(disorderItem(`大众（看过人数 > ${watchedRuler[3]}）：${(watchedDist[4].length / origin.length * 100).toFixed(2)}%（${randomFilmName(watchedDist[4], 3)} 等）`));
  text.push(separator());

  if (badGap.length > 0) {
    text.push(h2('差评高分片（豆瓣均分）\n'));
    text.push(bold(`共有 ${badGap.length} 部豆瓣高分电影在你这里评分很低。`));
    badGap.sort((a, b) => (b.score - b.userScore) - (a.score - a.userScore));
    badGap.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，豆瓣 ${obj.score} 分，你打了 ${textFromScore(obj.userScore)}`);
    });
    text.push(separator());
  }

  if (badGapWithFriends.length > 0) {
    text.push(h2('差评高分片（友邻均分）\n'));
    text.push(bold(`共有 ${badGapWithFriends.length} 部友邻高分电影在你这里评分很低。`));
    badGapWithFriends.sort((a, b) => (b.friendsScore - b.userScore) - (a.friendsScore - a.userScore));
    badGapWithFriends.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，${obj.friendsNoS} 位友邻打了 ${obj.friendsScore} 分，你打了 ${textFromScore(obj.userScore)}`);
    });
    text.push(separator());
  }

  if (friendsBadGap.length > 0) {
    text.push(h2('友邻差评高分片（豆瓣均分）\n'));
    text.push(bold(`共有 ${friendsBadGap.length} 部豆瓣高分电影在你的友邻里评分很低。`));
    friendsBadGap.sort((a, b) => (b.score - b.friendsScore) - (a.score - a.friendsScore));
    friendsBadGap.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，豆瓣 ${obj.score} 分，${obj.friendsNoS} 位友邻打了 ${obj.friendsScore} 分`);
    });
    text.push(separator());
  }

  if (goodGap.length > 0) {
    text.push(h2('好评低分片（豆瓣均分）\n'));
    text.push(bold(`共有 ${goodGap.length} 部豆瓣低分电影在你这里评分很高。`));
    goodGap.sort((a, b) => (b.userScore - b.score) - (a.userScore - a.score));
    goodGap.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，豆瓣 ${obj.score} 分，你打了 ${textFromScore(obj.userScore)}`);
    });
    text.push(separator());
  }

  if (goodGapWithFriends.length > 0) {
    text.push(h2('好评低分片（友邻均分）\n'));
    text.push(bold(`共有 ${goodGapWithFriends.length} 部友邻低分电影在你这里评分很高。`));
    goodGapWithFriends.sort((a, b) => (b.userScore - b.friendsScore) - (a.userScore - a.friendsScore));
    goodGapWithFriends.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，${obj.friendsNoS} 位友邻打了 ${obj.friendsScore} 分，你打了 ${textFromScore(obj.userScore)}`);
    });
    text.push(separator());
  }

  if (friendsGoodGap.length > 0) {
    text.push(h2('友邻好评低分片（豆瓣均分）\n'));
    text.push(bold(`共有 ${friendsGoodGap.length} 部豆瓣低分电影在你的友邻里评分很高。`));
    friendsGoodGap.sort((a, b) => (b.friendsScore - b.score) - (a.friendsScore - a.score));
    friendsGoodGap.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，豆瓣 ${obj.score} 分，${obj.friendsNoS} 位友邻打了 ${obj.friendsScore} 分`);
    });
    text.push(separator());
  }

  fs.writeFileSync(outputPath, text.join('\n'), 'utf8');
})();
