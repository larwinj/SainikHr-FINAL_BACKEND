const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');
const User = require('./User');

const AdminAccess = sequelize.define('AdminAccess', {
  userId: { type: DataTypes.UUID, primaryKey: true },
  roleName: DataTypes.STRING,
  manageAdmins: DataTypes.BOOLEAN,
  manageUsers: DataTypes.BOOLEAN,
  verifyCorporates: DataTypes.BOOLEAN,
  manageJobs: DataTypes.BOOLEAN,
  financialManagement: DataTypes.BOOLEAN,
  managePlans: DataTypes.BOOLEAN
}, {
  underscored: true,
  timestamps: false
});

// User.hasOne(AdminAccess, { foreignKey: 'userId' });

module.exports = AdminAccess;
