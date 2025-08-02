const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Resume = sequelize.define('Resume', {
  resumeId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  userId: DataTypes.UUID,
  title: DataTypes.STRING,
  contact: DataTypes.JSON, // Store all contact info as a JSON object
  profile: DataTypes.TEXT,
  skills: DataTypes.JSON,
  languages: DataTypes.JSON
}, {
  underscored: true,
  timestamps: true
});

module.exports = Resume;
