const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');
const User = require('./User');
const Job = require('./Job');

const JobViewsApplications = sequelize.define('JobViewsApplications', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id' // Match the database column name
    }
  },
  jobId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Job,
      key: 'job_id' // Match the database column name
    }
  },
  hasViewed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasApplied: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  viewedAt: {
    type: DataTypes.DATE
  },
  appliedAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'job_views_applications',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'job_id']
    }
  ]
});



module.exports = JobViewsApplications;