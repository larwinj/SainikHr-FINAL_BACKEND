const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');
const User = require('./User');
const CorporatePlan = require('./CorporatePlan');

const SubscribedPlan = sequelize.define('SubscribedPlan', {
  userId: DataTypes.UUID,
  planId: DataTypes.UUID,
  subscribedAt: DataTypes.DATE,
  expiredAt: DataTypes.DATE,
  resumeViewCount: DataTypes.INTEGER,
  profileVideoCount: DataTypes.INTEGER,
  jobPostedCount: DataTypes.INTEGER
}, {
  underscored: true,
  timestamps: false
});

// User.hasMany(SubscribedPlan, { foreignKey: 'userId' });
// CorporatePlan.hasMany(SubscribedPlan, { foreignKey: 'planId' });

module.exports = SubscribedPlan;
