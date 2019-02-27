import fs from 'fs';
import path from 'path';

import { mkdir } from '../src/util/';

const sortLikes = () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'));

  // let res = origin.filter((obj) => obj.commentLikes > 0);
  let res = origin.filter((obj) => obj.userComment !== '');
  let total = 0;
  res.forEach(obj => {
    total += obj.commentLikes || 0;
  });
  res = res.sort((a, b) => {
    if (a.commentLikes === b.commentLikes) {
      if (a.year === b.year) {
        return a.markDate - b.markDate;
      }
      return b.year - a.year;
    }
    return b.commentLikes - a.commentLikes;
  });
  return { res, total };
};

const getStatisticsText = ({ res, total }) => {
  const messages = [];
  res.forEach((obj, index) => {
    messages.push(`${index + 1}. 《${obj.name}》（${obj.commentLikes} 个有用）：${obj.userComment}`);
  });
  messages.splice(0, 0, `总计 ${total} 个赞！`);
  return messages.join('\n');
};

const doSort = () => {
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);

  const text = getStatisticsText(sortLikes());
  const outPath = path.join(outputDir, 'sortedComments.txt');
  fs.writeFileSync(outPath, text, 'utf8');
};

doSort();

export { sortLikes };
