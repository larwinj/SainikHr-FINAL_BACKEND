const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const ResumeEducation = sequelize.define('ResumeEducation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  resumeId: DataTypes.UUID,
  years: DataTypes.STRING,
  institution: DataTypes.STRING,
  degree: DataTypes.STRING,
  percentage: DataTypes.STRING
}, {
  underscored: true,
  timestamps: false
});

module.exports = ResumeEducation;
