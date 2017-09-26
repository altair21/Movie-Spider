import fs from 'fs';
import path from 'path';

import { checkResult } from '../src/helper';
import { initialState } from '../src/preset/prototype';

const genOutput = () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const _initialState = {
    ...initialState,
    infos: JSON.parse(fs.readFileSync(fullOutputPath, 'utf8')),
  };
  const finalState = checkResult(_initialState);
  console.log(finalState.logs.join('\n'));
};

genOutput();
