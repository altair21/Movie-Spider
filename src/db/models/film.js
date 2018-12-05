import S from 'sequelize';
import s from '../sequelize';

export const create = (sequelize = s, DataTypes = S) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.UUID,
      validate: {
        isLowercase: true,
      },
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    caseId: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    caseName: {
      type: DataTypes.STRING(64),
    },
    rawCaseName: {
      type: DataTypes.STRING(64),
    },
    studyuid: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    imagecount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    readyimagecount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(8),
      allowNull: false,
    },
    token: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    calcStatus: {
      type: DataTypes.STRING(16),
    },
    age: {
      type: DataTypes.INTEGER,
    },
    name: {
      type: DataTypes.STRING(64),
    },
    patientGender: {
      type: DataTypes.STRING(8),
    },
    hospital: {
      type: DataTypes.STRING,
    },
    studyDate: {
      type: DataTypes.INTEGER,
    },
    numbers: {
      type: DataTypes.INTEGER,
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    charset: 'utf8',
    collate: 'utf8_general_ci',
    defaultScope: {
      where: {
        deleted: false,
      },
    },
  });
  Task.associate = () => {

  };
  return Task;
};
