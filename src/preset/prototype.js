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
};

const initialState = {
  fullOutputPath: null,
  outputPath: null,
  manualPath: null,
  filterPath: null,
  config: initialConfig,
  startTime: new Date(),
  total: -1,
  actualTotal: 0,
  infos: [],
  appendedItem: [],
  errorItem: {
    poster: [],
    year: [],
    director: [],
  },
  logs: [],
};

export { initialState };
