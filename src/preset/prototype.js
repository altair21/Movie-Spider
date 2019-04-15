
const initialConfig = {
  id: undefined,
  ssh: {
    user: undefined,
    host: undefined,
    port: 22,
    path: undefined,
  },
  shuffle: false,
  outputAsJS: false,
  keywords: [],
  username: undefined,
  password: undefined,
  concurrency: undefined,
  ignoreTags: true,
  cookie: undefined,
  ignoreFriends: false,
  ignoreFriendsForOther: true,
  filter: {
    filterCategory: false,
    filterTag: false,
    keywords: {
      category: [],
      tags: [],
    },
    logical: 'or',
    sortMode: 'year',
    order: 'desc',
  },
};

const initialState = {
  origin: [],
  outputPath: null,
  manual: [],
  config: initialConfig,
  startTime: new Date(),
  total: -1,
  actualTotal: 0,
  sent: false,
  page: null,
  infos: [],
  ruleoutItems: [],
  appendedItem: [],
  logs: [],
  errorMessages: [],
  changes: [],
  getText: () => '',
};

export { initialState };
