/**
 * Author: altair21
 * Date: 2018.02.09
 * Description: 分析用户的打分分布，看片类型分布，恶评高分片、优评低分片。友邻打分和豆瓣均分对比等。
 * Output: Markdown File
 */

import fs from 'fs';
import path from 'path';
import _ from 'lodash';

// Macro
const gapThreshold = 2;
const hasFriends = true;  // 是否生成友邻报告
const friendsNosThreshold = 5;  // 友邻评分人数小于这个值就不统计了

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

(async () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const outputPath = path.join(__dirname, '..', 'output', 'user.md');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8')).filter(o => !o.isManual);
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

  let latestMarkDate;

  origin.forEach((obj) => {
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
      if (obj.userScore !== 0) totalScored++;
      else {
        noScoreFilms.push({
          name: obj.name,
          year: obj.year,
          director: obj.director.join('、'),
        });
      }
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

  // 输出
  text.push('## 概况\n');
  text.push(`*数据统计来自 ${origin.length} 部影片*`);
  text.push(`根据标记记录截止至 ${latestMarkDate}`);
  text.push('\n---\n');

  text.push('## 类型分布\n');
  category.sort((a, b) => b.num - a.num);
  category.forEach((co, index) => {
    text.push(`${index + 1}. ${co.category} 共计 ${co.num} 部`);
  });
  text.push('\n---\n');

  text.push('## 打分分布\n');
  text.push(`**打分的电影有 ${totalScored} 部，占比 ${(totalScored / origin.length * 100).toFixed(3)}%**`);
  if (noScoreFilms.length > 0) {
    text.push(`**未打分的电影共有 ${origin.length - totalScored} 部，占比 ${((origin.length - totalScored) / origin.length * 100).toFixed(3)}%**`);
  }
  text.push(`- 五星电影：${score[5]} 部，占比 ${(score[5] / totalScored * 100).toFixed(2)}%`);
  text.push(`- 四星电影：${score[4]} 部，占比 ${(score[4] / totalScored * 100).toFixed(2)}%`);
  text.push(`- 三星电影：${score[3]} 部，占比 ${(score[3] / totalScored * 100).toFixed(2)}%`);
  text.push(`- 两星电影：${score[2]} 部，占比 ${(score[2] / totalScored * 100).toFixed(2)}%`);
  text.push(`- 一星电影：${score[1]} 部，占比 ${(score[1] / totalScored * 100).toFixed(2)}%`);
  if (noScoreFilms.length > 0) {
    text.push('\n未打分影片：');
    noScoreFilms.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})`);
    });
  }
  text.push('\n---\n');

  if (badGap.length > 0) {
    text.push('## 差评高分片（豆瓣均分）\n');
    text.push(`**共有 ${badGap.length} 部豆瓣高分电影在你这里评分很低。**`);
    badGap.sort((a, b) => (b.score - b.userScore) - (a.score - a.userScore));
    badGap.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，豆瓣 ${obj.score} 分，你打了 ${textFromScore(obj.userScore)}`);
    });
    text.push('\n---\n');
  }

  if (badGapWithFriends.length > 0) {
    text.push('## 差评高分片（友邻均分）\n');
    text.push(`**共有 ${badGapWithFriends.length} 部友邻高分电影在你这里评分很低。**`);
    badGapWithFriends.sort((a, b) => (b.friendsScore - b.userScore) - (a.friendsScore - a.userScore));
    badGapWithFriends.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，${obj.friendsNoS} 位友邻打了 ${obj.friendsScore} 分，你打了 ${textFromScore(obj.userScore)}`);
    });
    text.push('\n---\n');
  }

  if (friendsBadGap.length > 0) {
    text.push('## 友邻差评高分片（豆瓣均分）\n');
    text.push(`**共有 ${friendsBadGap.length} 部豆瓣高分电影在你的友邻里评分很低。**`);
    friendsBadGap.sort((a, b) => (b.score - b.friendsScore) - (a.score - a.friendsScore));
    friendsBadGap.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，豆瓣 ${obj.score} 分，${obj.friendsNoS} 位友邻打了 ${obj.friendsScore} 分`);
    });
    text.push('\n---\n');
  }

  if (goodGap.length > 0) {
    text.push('## 好评低分片（豆瓣均分）\n');
    text.push(`**共有 ${goodGap.length} 部豆瓣低分电影在你这里评分很高。**`);
    goodGap.sort((a, b) => (b.userScore - b.score) - (a.userScore - a.score));
    goodGap.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，豆瓣 ${obj.score} 分，你打了 ${textFromScore(obj.userScore)}`);
    });
    text.push('\n---\n');
  }

  if (goodGapWithFriends.length > 0) {
    text.push('## 好评低分片（友邻均分）\n');
    text.push(`**共有 ${goodGapWithFriends.length} 部友邻低分电影在你这里评分很高。**`);
    goodGapWithFriends.sort((a, b) => (b.userScore - b.friendsScore) - (a.userScore - a.friendsScore));
    goodGapWithFriends.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，${obj.friendsNoS} 位友邻打了 ${obj.friendsScore} 分，你打了 ${textFromScore(obj.userScore)}`);
    });
    text.push('\n---\n');
  }

  if (friendsGoodGap.length > 0) {
    text.push('## 友邻好评低分片（豆瓣均分）\n');
    text.push(`**共有 ${friendsGoodGap.length} 部豆瓣低分电影在你的友邻里评分很高。**`);
    friendsGoodGap.sort((a, b) => (b.friendsScore - b.score) - (a.friendsScore - a.score));
    friendsGoodGap.forEach((obj, index) => {
      text.push(`${index + 1}. ${obj.director} 执导的 《${obj.name}》(${obj.year})，豆瓣 ${obj.score} 分，${obj.friendsNoS} 位友邻打了 ${obj.friendsScore} 分`);
    });
    text.push('\n---\n');
  }

  fs.writeFileSync(outputPath, text.join('\n'), 'utf8');
})();
