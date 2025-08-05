const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');
const SubscribedPlan = require('./SubscribedPlan');

const CurrentSubscribedPlan = sequelize.define('CurrentSubscribedPlan', {
  userId: { 
    type: DataTypes.UUID, 
    primaryKey: true,
    unique: true // Ensure only one active subscription per user
  },
  subscriptionId: { 
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  underscored: true,
  timestamps: false,
});

module.exports = CurrentSubscribedPlan;