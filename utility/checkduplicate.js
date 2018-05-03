import fs from 'fs';
import path from 'path';

const fullPath = path.join(__dirname, '..', 'output', 'full_output.json');
const full = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

const main = () => {
  for (let i = 0; i < full.length; i++) {
    for (let j = 0; j < full.length; j++) {
      if (i === j) continue;  // eslint-disable-line
      if (full[i].id === full[j].id) {
        console.log(`${full[i].name} 出现重复`);
      }
    }
  }
};

main();
