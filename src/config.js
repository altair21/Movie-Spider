import fs from 'fs';
import path from 'path';
import { initialState } from './preset/prototype';

const configPath = path.join(__dirname, '..', 'config.json');

if (!fs.existsSync(configPath)) {
  throw new Error(`没有找到配置文件 ${configPath}`);
}

export const config = {
  ...initialState.config,
  ...JSON.parse(fs.readFileSync(configPath, 'utf8')),
};
