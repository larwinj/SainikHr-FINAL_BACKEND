const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Access = sequelize.define('Access', {
  accessId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  planId: { type: DataTypes.UUID, allowNull: false },
  profileVideo: DataTypes.BOOLEAN,
  resume: DataTypes.BOOLEAN,
  jobPost: DataTypes.BOOLEAN,
  profileVideoCountLimit: DataTypes.INTEGER,
  resumeCountLimit: DataTypes.INTEGER,
  jobPostCountLimit: DataTypes.INTEGER
}, {
  underscored: true,
  timestamps: false
});

module.exports = Access;