const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');
const User = require('./User');
const CorporatePlan = require('./CorporatePlan');

const SubscribedPlan = sequelize.define('SubscribedPlan', {
  userId: { type: DataTypes.UUID, primaryKey: true },
  planId: { type: DataTypes.UUID },
  subscribedAt: DataTypes.DATE,
  expiredAt: DataTypes.DATE,
  resumeViewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  profileVideoCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  jobPostedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  resetAt: { type: DataTypes.DATE },
  profileVideoValidUntil: { type: DataTypes.DATE, allowNull: true }, // New field
}, {
  underscored: true,
  timestamps: false,
});

// Associations
User.hasMany(SubscribedPlan, { foreignKey: 'userId' });
CorporatePlan.hasMany(SubscribedPlan, { foreignKey: 'planId' });
SubscribedPlan.belongsTo(User, { foreignKey: 'userId' });
SubscribedPlan.belongsTo(CorporatePlan, { foreignKey: 'planId' });

module.exports = SubscribedPlan;
