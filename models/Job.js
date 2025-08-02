const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');
const User = require('./User');

const Job = sequelize.define('Job', {
  jobId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  companyName: DataTypes.STRING,
  role: DataTypes.STRING,
  jobDescription: DataTypes.TEXT,
  jobType: DataTypes.STRING,
  industry: DataTypes.STRING,
  companySize: DataTypes.STRING,
  contactPerson: DataTypes.JSON,
  requirements: DataTypes.JSON,
  salaryRange: DataTypes.JSON,
  postedMethod: DataTypes.ENUM('private', 'public'),
  website: DataTypes.STRING,
  addressCity: DataTypes.STRING,
  addressState: DataTypes.STRING,
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  application_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  email: DataTypes.STRING
}, {
  tableName: 'jobs',
  underscored: true,
  timestamps: true
});

module.exports = Job;