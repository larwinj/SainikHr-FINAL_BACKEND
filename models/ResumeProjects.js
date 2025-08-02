const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const ResumeProjects = sequelize.define('ResumeProjects', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  resumeId: DataTypes.UUID,
  title: DataTypes.STRING,
  role: DataTypes.STRING,
  year: DataTypes.STRING,
  description: DataTypes.TEXT
}, {
  underscored: true,
  timestamps: false
});

module.exports = ResumeProjects;
