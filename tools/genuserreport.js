/* eslint-disable yoda */
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
import { findRecommand } from './genrecommand';
import { findAwards, keyAwards } from './genawards';
import { mkdir, openFilmOrigin } from '../src/util';
import { sortLikes } from './sortcommentlikes';

// -- Macro
const Threshold = {
  scoreGap: 2.1,
  displayFilmCount: {
    noScore: 10,
    badGap: 10,
    goodGap: 10,
    recommand: 10,
    commentLikes: 5,
  },
};
const hasFriends = true;  // 是否生成友邻报告
const friendsNosThreshold = 5;  // 友邻评分人数小于这个值就不统计了
// -- Macro

const thisYear = +`${(new Date()).getFullYear()}`;
const timesIndex = {
  before1930: 0,
  after1930before1945: 1,
  after1945before1960: 2,
  after1960before1980: 3,
  after1980before2000: 4,
  after2000before2010: 5,
  after2010: 6,
  lastYear: 7,
  thisYear: 8,
  unknown: 9,
};
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

const getTimesIndex = (year) => {
  if (year === thisYear) {
    return timesIndex.thisYear;
  } else if (year === thisYear - 1) {
    return timesIndex.lastYear;
  } else if (year >= 2010) {
    return timesIndex.after2010;
  } else if (2010 > year && year >= 2000) {
    return timesIndex.after2000before2010;
  } else if (2000 > year && year >= 1980) {
    return timesIndex.after1980before2000;
  } else if (1980 > year && year >= 1960) {
    return timesIndex.after1960before1980;
  } else if (1960 > year && year >= 1945) {
    return timesIndex.after1945before1960;
  } else if (1945 > year && year >= 1930) {
    return timesIndex.after1930before1945;
  } else if (1930 > year) {
    return timesIndex.before1930;
  }
  return timesIndex.unknown;
};

// 计算占比
const calcProportion = (numerator, denominator, fixedNum = 2) =>
  `${+(numerator / denominator * 100).toFixed(fixedNum)}%`;

(async () => {
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);
  const outputPath = path.join(outputDir, 'user.md');
  const origin = openFilmOrigin(true);
  const category = [];  // 类型分布统计
  const country = []; // 地区分布
  const times = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 1930之前、1930~1945、1945~1960、1960~1980、1980~2000、2000~2010、2010之后、lastYear、thisYear，未知年代
  const yearFilms = {}; // 每一年的电影数
  let mostWatchedYear = ''; // 哪年的电影看得最多
  let mostWatchedYearNum = 0;
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
  const recommandRes = findRecommand();
  const awardRes = findAwards();
  for (let i = 0, l = keyAwards.length; i < l; i++) {
    awardRes[keyAwards[i].name][keyAwards[i].keywords[0].name] =
      awardRes[keyAwards[i].name][keyAwards[i].keywords[0].name].filter(obj => obj.award.indexOf('提名') === -1);
  }
  const commentLikesRes = sortLikes();

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

    // 【统计地区分布】
    if (obj.country) {
      obj.country.forEach((c) => {
        const findObj = _.find(country, o => o.country === c);
        if (findObj) {
          findObj.num++;
        } else {
          country.push({
            country: c,
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

    // 【统计年代分布】
    times[getTimesIndex(+obj.year)]++;
    if (obj.year !== '') {
      yearFilms[obj.year] = yearFilms[obj.year] ? yearFilms[obj.year] + 1 : 1;
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
    if (obj.score - obj.userScore * 2 >= Threshold.scoreGap && obj.userScore > 0 && +obj.score >= 7.5) {
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
      && obj.friendsScore - obj.userScore * 2 >= Threshold.scoreGap
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
      && obj.score - obj.friendsScore >= Threshold.scoreGap && +obj.score >= 7.5) {
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
    if (obj.userScore * 2 - obj.score >= Threshold.scoreGap && +obj.score < 7.5) {
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
      && obj.userScore * 2 - obj.friendsScore >= Threshold.scoreGap && +obj.friendsScore < 7.5) {
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
      && obj.friendsScore - obj.score >= Threshold.scoreGap && +obj.score < 7.5) {
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

  const yearFilmNumArr = Object.keys(yearFilms);
  for (let i = 0, l = yearFilmNumArr.length; i < l; i++) {
    const key = yearFilmNumArr[i];
    if (yearFilms[key] > mostWatchedYearNum) {
      mostWatchedYear = key;
      mostWatchedYearNum = yearFilms[key];
    }
  }

  // 输出
  text.push(h2('概况\n'));
  text.push(italic(`数据统计来自 ${origin.length} 部影片`));
  text.push(`根据标记记录截止至 ${latestMarkDate}`);
  text.push(separator());

  text.push(h2('类型分布\n'));
  text.push(`在 ${origin.length} 部影片里，\
长片有 ${origin.filter(obj => obj.category.indexOf('短片') === -1).length} 部，\
短片有 ${origin.filter(obj => obj.category.indexOf('短片') !== -1).length} 部。\
长片共有 ${origin.filter(obj => obj.category.indexOf('短片') === -1 && obj.category.indexOf('纪录片') === -1).length} 部故事片\
和 ${origin.filter(obj => obj.category.indexOf('短片') === -1 && obj.category.indexOf('纪录片') !== -1).length} 部纪录片，\
短片共有 ${origin.filter(obj => obj.category.indexOf('短片') !== -1 && obj.category.indexOf('纪录片') === -1).length} 部故事片\
和 ${origin.filter(obj => obj.category.indexOf('短片') !== -1 && obj.category.indexOf('纪录片') !== -1).length} 部纪录片。`);
  text.push('\n以下是常看的电影类型：');
  category.sort((a, b) => b.num - a.num);
  category.forEach((co, index) => {
    text.push(`${index + 1}. ${co.category} 共计 ${co.num} 部（${calcProportion(co.num, origin.length)}）`);
  });
  text.push(separator());

  text.push(h2('地区分布\n'));
  text.push(italic('合拍片会多次计算'));
  country.sort((a, b) => b.num - a.num);
  country.forEach((co, index) => {
    text.push(`${index + 1}. ${co.country} 共计 ${co.num} 部（${calcProportion(co.num, origin.length)}）`);
  });
  text.push(separator());

  text.push(h2('获奖影片分布\n'));
  keyAwards.forEach(award => {
    text.push(disorderItem(`看过 ${awardRes[award.name][award.keywords[0].name].length} 部${award.name}的${award.keywords[0].name}`));
  });
  text.push(separator());

  text.push(h2('年代分布\n'));
  text.push(italic(`${mostWatchedYear} 年的电影你看得最多，一共有 ${mostWatchedYearNum} 部。`));
  if (times[timesIndex.thisYear] > 0) {
    text.push(disorderItem(`${thisYear}年：${times[timesIndex.thisYear]} 部（${calcProportion(times[timesIndex.thisYear], origin.length)}）`));
  }
  if (times[timesIndex.lastYear] > 0) {
    text.push(disorderItem(`${+thisYear - 1}年：${times[timesIndex.lastYear]} 部（${calcProportion(times[timesIndex.lastYear], origin.length)}）`));
  }
  if (times[timesIndex.after2010] > 0) {
    text.push(disorderItem(`2010年之后：${times[timesIndex.after2010]} 部（${calcProportion(times[timesIndex.after2010], origin.length)}）`));
  }
  if (times[timesIndex.after2000before2010] > 0) {
    text.push(disorderItem(`2000~2010年：${times[timesIndex.after2000before2010]} 部（${calcProportion(times[timesIndex.after2000before2010], origin.length)}）`));
  }
  if (times[timesIndex.after1980before2000] > 0) {
    text.push(disorderItem(`1980~2000年：${times[timesIndex.after1980before2000]} 部（${calcProportion(times[timesIndex.after1980before2000], origin.length)}）`));
  }
  if (times[timesIndex.after1960before1980] > 0) {
    text.push(disorderItem(`1960~1980年：${times[timesIndex.after1960before1980]} 部（${calcProportion(times[timesIndex.after1960before1980], origin.length)}）`));
  }
  if (times[timesIndex.after1945before1960] > 0) {
    text.push(disorderItem(`1945~1960年：${times[timesIndex.after1945before1960]} 部（${calcProportion(times[timesIndex.after1945before1960], origin.length)}）`));
  }
  if (times[timesIndex.after1930before1945] > 0) {
    text.push(disorderItem(`1930~1945年：${times[timesIndex.after1930before1945]} 部（${calcProportion(times[timesIndex.after1930before1945], origin.length)}）`));
  }
  if (times[timesIndex.before1930] > 0) {
    text.push(disorderItem(`1930年之前：${times[timesIndex.before1930]} 部（${calcProportion(times[timesIndex.before1930], origin.length)}）`));
  }
  if (times[timesIndex.unknown] > 0) {
    text.push(disorderItem(`未知年代：${times[timesIndex.unknown]} 部（${calcProportion(times[timesIndex.unknown], origin.length)}）`));
  }
  text.push(separator());

  text.push(h2('打分分布\n'));
  text.push(bold(`打分的电影有 ${totalScored} 部，占比 ${calcProportion(totalScored, origin.length, 3)}`));
  if (noScoreFilms.length > 0) {
    text.push(bold(`未打分的电影共有 ${origin.length - totalScored} 部，占比 ${calcProportion(origin.length - totalScored, origin.length, 3)}`));
  }
  text.push(disorderItem(`五星电影：${score[5]} 部，占比 ${calcProportion(score[5], totalScored)}`));
  text.push(disorderItem(`四星电影：${score[4]} 部，占比 ${calcProportion(score[4], totalScored)}`));
  text.push(disorderItem(`三星电影：${score[3]} 部，占比 ${calcProportion(score[3], totalScored)}`));
  text.push(disorderItem(`两星电影：${score[2]} 部，占比 ${calcProportion(score[2], totalScored)}`));
  text.push(disorderItem(`一星电影：${score[1]} 部，占比 ${calcProportion(score[1], totalScored)}`));
  if (noScoreFilms.length > 0) {
    text.push('\n未打分影片：');
    noScoreFilms.forEach((obj, index) => {
      if (index < Threshold.displayFilmCount.noScore) {
        text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})`);
      } else if (index === Threshold.displayFilmCount.noScore + 1) {
        text.push(`······ 还有 ${noScoreFilms.length - Threshold.displayFilmCount.noScore} 部`);
      }
    });
  }
  text.push(separator());

  if (commentLikesRes.total > 0) {
    text.push(h2('受欢迎的短评'));
    text.push(italic(`你一共写了 ${commentLikesRes.res.length} 条短评，收获了 ${commentLikesRes.total} 个赞。以下是一些最受欢迎的短评：`));
    commentLikesRes.res.forEach((obj, index) => {
      if (index < Threshold.displayFilmCount.commentLikes) {
        text.push(`${index + 1}. 《${obj.name}》（${obj.commentLikes} 个赞）：${obj.userComment}`);
      }
    });
    text.push(separator());
  }

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
  text.push(`在你看过的电影里面，${maxScorePercFilm.director.join('、')} 执导的 《${maxScorePercFilm.name}》(${maxScorePercFilm.year}) 打分人数在看过人数中的占比最高（${calcProportion(maxScorePercFilm.numberOfScore, maxScorePercFilm.numberOfWatched)}）`);
  text.push(`在你看过的电影里面，${minScorePercFilm.director.join('、')} 执导的 《${minScorePercFilm.name}》(${minScorePercFilm.year}) 打分人数在看过人数中的占比最低（${calcProportion(minScorePercFilm.numberOfScore, minScorePercFilm.numberOfWatched)}）`);
  text.push(separator());

  text.push(h2('观众人数分布'));
  text.push(italic('按照影片看过的人数将影片分为“大众”和“小众”：'));
  text.push(disorderItem(`小众（看过人数 < ${watchedRuler[0]}）：${calcProportion(watchedDist[0].length, origin.length)}（${randomFilmName(watchedDist[0], 3)} 等）`));
  text.push(disorderItem(`较为小众（看过人数 ${watchedRuler[0]} ~ ${watchedRuler[1]}）：${calcProportion(watchedDist[1].length, origin.length)}（${randomFilmName(watchedDist[1], 3)} 等）`));
  text.push(disorderItem(`一般（看过人数 ${watchedRuler[1]} ~ ${watchedRuler[2]}）：${calcProportion(watchedDist[2].length, origin.length)}（${randomFilmName(watchedDist[2], 3)} 等）`));
  text.push(disorderItem(`较为大众（看过人数 ${watchedRuler[2]} ~ ${watchedRuler[3]}）：${calcProportion(watchedDist[3].length, origin.length)}（${randomFilmName(watchedDist[3], 3)} 等）`));
  text.push(disorderItem(`大众（看过人数 > ${watchedRuler[3]}）：${calcProportion(watchedDist[4].length, origin.length)}（${randomFilmName(watchedDist[4], 3)} 等）`));
  text.push(separator());

  if (badGap.length > 0) {
    text.push(h2('差评高分片（豆瓣均分）\n'));
    text.push(bold(`共有 ${badGap.length} 部豆瓣高分电影在你这里评分很低。`));
    badGap.sort((a, b) => (b.score - b.userScore) - (a.score - a.userScore));
    badGap.forEach((obj, index) => {
      if (index < Threshold.displayFilmCount.badGap) {
        text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，豆瓣 ${obj.score} 分，你打了 ${textFromScore(obj.userScore)}`);
      } else if (index === Threshold.displayFilmCount.badGap + 1) {
        text.push(`······ 还有 ${badGap.length - Threshold.displayFilmCount.badGap} 部`);
      }
    });
    text.push(separator());
  }

  if (badGapWithFriends.length > 0) {
    text.push(h2('差评高分片（友邻均分）\n'));
    text.push(bold(`共有 ${badGapWithFriends.length} 部友邻高分电影在你这里评分很低。`));
    badGapWithFriends.sort((a, b) => (b.friendsScore - b.userScore) - (a.friendsScore - a.userScore));
    badGapWithFriends.forEach((obj, index) => {
      if (index < Threshold.displayFilmCount.badGap) {
        text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，${obj.friendsNoS} 位友邻打了 ${obj.friendsScore} 分，你打了 ${textFromScore(obj.userScore)}`);
      } else if (index === Threshold.displayFilmCount.badGap + 1) {
        text.push(`······ 还有 ${badGapWithFriends.length - Threshold.displayFilmCount.badGap} 部`);
      }
    });
    text.push(separator());
  }

  if (friendsBadGap.length > 0) {
    text.push(h2('友邻差评高分片（豆瓣均分）\n'));
    text.push(bold(`共有 ${friendsBadGap.length} 部豆瓣高分电影在你的友邻里评分很低。`));
    friendsBadGap.sort((a, b) => (b.score - b.friendsScore) - (a.score - a.friendsScore));
    friendsBadGap.forEach((obj, index) => {
      if (index < Threshold.displayFilmCount.badGap) {
        text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，豆瓣 ${obj.score} 分，${obj.friendsNoS} 位友邻打了 ${obj.friendsScore} 分`);
      } else if (index === Threshold.displayFilmCount.badGap + 1) {
        text.push(`······ 还有 ${friendsBadGap.length - Threshold.displayFilmCount.badGap} 部`);
      }
    });
    text.push(separator());
  }

  if (goodGap.length > 0) {
    text.push(h2('好评低分片（豆瓣均分）\n'));
    text.push(bold(`共有 ${goodGap.length} 部豆瓣低分电影在你这里评分很高。`));
    goodGap.sort((a, b) => (b.userScore - b.score) - (a.userScore - a.score));
    goodGap.forEach((obj, index) => {
      if (index < Threshold.displayFilmCount.goodGap) {
        text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，豆瓣 ${obj.score} 分，你打了 ${textFromScore(obj.userScore)}`);
      } else if (index === Threshold.displayFilmCount.goodGap + 1) {
        text.push(`······ 还有 ${goodGap.length - Threshold.displayFilmCount.goodGap} 部`);
      }
    });
    text.push(separator());
  }

  if (goodGapWithFriends.length > 0) {
    text.push(h2('好评低分片（友邻均分）\n'));
    text.push(bold(`共有 ${goodGapWithFriends.length} 部友邻低分电影在你这里评分很高。`));
    goodGapWithFriends.sort((a, b) => (b.userScore - b.friendsScore) - (a.userScore - a.friendsScore));
    goodGapWithFriends.forEach((obj, index) => {
      if (index < Threshold.displayFilmCount.goodGap) {
        text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，${obj.friendsNoS} 位友邻打了 ${obj.friendsScore} 分，你打了 ${textFromScore(obj.userScore)}`);
      } else if (index === Threshold.displayFilmCount.goodGap + 1) {
        text.push(`······ 还有 ${goodGapWithFriends.length - Threshold.displayFilmCount.goodGap} 部`);
      }
    });
    text.push(separator());
  }

  if (friendsGoodGap.length > 0) {
    text.push(h2('友邻好评低分片（豆瓣均分）\n'));
    text.push(bold(`共有 ${friendsGoodGap.length} 部豆瓣低分电影在你的友邻里评分很高。`));
    friendsGoodGap.sort((a, b) => (b.friendsScore - b.score) - (a.friendsScore - a.score));
    friendsGoodGap.forEach((obj, index) => {
      if (index < Threshold.displayFilmCount.goodGap) {
        text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，豆瓣 ${obj.score} 分，${obj.friendsNoS} 位友邻打了 ${obj.friendsScore} 分`);
      } else if (index === Threshold.displayFilmCount.goodGap + 1) {
        text.push(`······ 还有 ${friendsGoodGap.length - Threshold.displayFilmCount.goodGap} 部`);
      }
    });
    text.push(separator());
  }

  text.push(h2('影片推荐'));
  text.push('根据你标记过的影片，我猜下面这些电影会符合你的口味儿：');
  recommandRes.forEach((obj, index) => {
    if (index < Threshold.displayFilmCount.recommand) {
      text.push(disorderItem(`《${obj.name}》（https://movie.douban.com/subject/${obj.id}）`));
    }
  });
  text.push(separator());

  fs.writeFileSync(outputPath, text.join('\n'), 'utf8');
})();
