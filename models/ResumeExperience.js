const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const ResumeExperience = sequelize.define('ResumeExperience', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  resumeId: DataTypes.UUID,
  company: DataTypes.STRING,
  role: DataTypes.STRING,
  duration: DataTypes.STRING,
  responsibilities: DataTypes.JSON
}, {
  underscored: true,
  timestamps: false
});

module.exports = ResumeExperience;
