import Sequelize from 'sequelize';

import { config } from '../config';

const sequelize = new Sequelize(config.db.database, config.db.username, config.db.password, {
  host: config.db.host,
  dialect: config.db.dialet,
  operatorsAliases: false,
  define: {
    charset: 'utf8',
    collate: 'utf8_general_ci',
  },

  pool: {
    max: 5,
    min: 0,
    idle: 10000,
  },
});

const isStringField = (fieldType) =>
  fieldType instanceof Sequelize.TEXT
    || fieldType instanceof Sequelize.STRING
    || fieldType instanceof Sequelize.UUIDV1
    || fieldType instanceof Sequelize.UUIDV4;

const delay = ms => new Promise(res => setTimeout(res, ms));
const ensureDBConnection = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({});
    return true;
  } catch (e) {
    if (e instanceof Sequelize.ValidationError) {
      throw e;
    }
    console.log(`sequelize.authenticate failed: ${e.message}`);
    await delay(1000);
    return ensureDBConnection();
  }
};

const startTransaction = (func, isolationLevel = Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE) =>
  sequelize.transaction({
    isolationLevel,
  }, func);

export default sequelize;
export {
  isStringField,
  ensureDBConnection,
  startTransaction,
};
