const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CorporatePlan = sequelize.define('CorporatePlan', {
  planId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  planName: { type: DataTypes.STRING, allowNull: false, unique: true },
  profileVideo: { type: DataTypes.BOOLEAN, defaultValue: false },
  profileVideoCountLimit: { type: DataTypes.INTEGER, allowNull: true }, // Null for unlimited
  resume: { type: DataTypes.BOOLEAN, defaultValue: false },
  resumeCountLimit: { type: DataTypes.INTEGER, allowNull: true }, // Null for unlimited
  jobPost: { type: DataTypes.BOOLEAN, defaultValue: false },
  jobPostCountLimit: { type: DataTypes.INTEGER, allowNull: true }, // Null for unlimited
  skillLocationFilters: { type: DataTypes.BOOLEAN, defaultValue: false }, // New field
  matchCandidatesEmailing: { type: DataTypes.BOOLEAN, defaultValue: false }, // New field
  durationValue: { type: DataTypes.DOUBLE, allowNull: false },
  durationUnit: { type: DataTypes.STRING, allowNull: false },
  rate: { type: DataTypes.DOUBLE, allowNull: false },
  currency: { type: DataTypes.STRING, allowNull: false },
}, {
  underscored: true,
  timestamps: true,
});

module.exports = CorporatePlan;