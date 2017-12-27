import fs from 'fs';
import path from 'path';

const sortLikes = () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const outPath = path.join(__dirname, '..', 'output', 'sortedComments.txt');
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
  res.forEach((obj, index) => {
    messages.push(`${index + 1}. 《${obj.name}》（${obj.commentLikes} 个有用）：${obj.userComment}`);
  });
  fs.writeFileSync(outPath, messages.join('\n'));
};

sortLikes();
