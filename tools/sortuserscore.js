import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { config } from '../src/config';
import { mkdir, openFilmOrigin } from '../src/util';

const filmProtoType = {
  name: '',
  year: '',
  directors: [],
  userScore: 0,
  comment: '',
  commentLikes: 0,
};

const { splitByYear } = config.tool.sortUserScore;

const sortFunc = (a, b) => {
  if (splitByYear) {
    if (a.year === b.year) {
      if (a.userScore === b.userScore) {
        return (+b.commentLikes) - (+a.commentLikes);
      }
      return (+b.userScore) - (+a.userScore);
    }
    return (+b.year) - (+a.year);
  }

  if (a.userScore === b.userScore) {
    if (a.year === b.year) {
      return (+b.commentLikes) - (+a.commentLikes);
    }
    return (+a.year) - (+b.year);
  }
  return (+b.userScore) - (+a.userScore);
};

const getResult = () => {
  const origin = openFilmOrigin(true);
  const res = [];

  origin.forEach((obj) => {
    res.push({
      ...filmProtoType,
      name: obj.name,
      year: obj.year,
      directors: obj.director,
      userScore: obj.userScore,
      comment: obj.userComment,
      commentLikes: obj.commentLikes,
    });
  });

  return res.sort(sortFunc);
};

const getStatisticsText = (res) => {
  const text = [];

  if (splitByYear) {
    text.push(`${res[0].year} 年：`);
  }
  for (let i = 0, l = res.length; i < l; i++) {
    if (splitByYear && i - 1 >= 0 && res[i].year !== res[i - 1].year) {
      text.push(`\n${res[i].year} 年：`);
    }

    const score = res[i].userScore > 0 ? (() => {
      let scoreStr = '';
      for (let j = 0, m = res[i].userScore; j < m; j++) {
        scoreStr += '⭐️';
      }
      return scoreStr;
    })() : '未打分';
    const directors = (res[i].directors && res[i].directors.length > 0) ?
    `（${(res[i].directors || []).join('、')} 执导）` : '';
    const comment = res[i].comment ? `：${res[i].comment}` : '';
    const commentLikes = res[i].commentLikes > 0 ?
      `（${res[i].commentLikes} 个有用）` : '';
    text.push(`[${score}]${res[i].name}${directors}${comment}${commentLikes}`);
  }

  return text.join('\n');
};

const sortUserScore = () => {
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);
  const text = getStatisticsText(getResult());

  const filePath = process.argv[2] ? path.join(process.argv[2], 'sortuserscore.txt') : path.join(outputDir, 'sortuserscore.txt');
  fs.writeFileSync(filePath, text, 'utf8');
};

sortUserScore();

export { getResult as getSortUserScoreResult };
