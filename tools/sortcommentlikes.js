import fs from 'fs';
import path from 'path';

import { mkdir } from '../src/util/';

const sortLikes = () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);
  const outPath = path.join(outputDir, 'sortedComments.txt');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'));

  // let res = origin.filter((obj) => obj.commentLikes > 0);
  let res = origin.filter((obj) => obj.userComment !== '');
  res = res.sort((a, b) => {
    if (a.commentLikes === b.commentLikes) {
      if (a.year === b.year) {
        return a.markDate - b.markDate;
      }
      return b.year - a.year;
    }
    return b.commentLikes - a.commentLikes;
  });
  const messages = [];
  let total = 0;
  res.forEach((obj, index) => {
    total += obj.commentLikes || 0;
    messages.push(`${index + 1}. 《${obj.name}》（${obj.commentLikes} 个有用）：${obj.userComment}`);
  });
  messages.push(`总计 ${total} 个赞！`);
  fs.writeFileSync(outPath, messages.join('\n'));
};

sortLikes();
