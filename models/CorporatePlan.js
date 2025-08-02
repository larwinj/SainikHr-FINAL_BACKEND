const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CorporatePlan = sequelize.define('CorporatePlan', {
  planId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  planName: DataTypes.STRING,
  profileVideo: DataTypes.BOOLEAN,
  profileVideoCountLimit: DataTypes.INTEGER,
  resume: DataTypes.BOOLEAN,
  resumeCountLimit: DataTypes.INTEGER,
  jobPost: DataTypes.BOOLEAN,
  jobPostCountLimit: DataTypes.INTEGER,
  durationValue: DataTypes.DOUBLE,
  durationUnit: DataTypes.STRING,
  rate: DataTypes.DOUBLE,
  currency: DataTypes.STRING
}, {
  underscored: true,
  timestamps: true
});

module.exports = CorporatePlan;
