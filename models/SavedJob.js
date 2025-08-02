const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const SavedJob = sequelize.define('SavedJob', {
  userId: DataTypes.UUID,
  jobId: DataTypes.UUID,
  createdAt: DataTypes.DATE
}, {
  underscored: true,
  timestamps: false
});

module.exports = SavedJob;
