const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');
const User = require('./User');

const VeteranDetails = sequelize.define('VeteranDetails', {
  userId: { type: DataTypes.UUID, primaryKey: true },
  phone: DataTypes.STRING,
  location: DataTypes.STRING,
  pincode: DataTypes.STRING,
  linkedinUrl: DataTypes.STRING,
  githubUrl: DataTypes.STRING,
  profileSummary: DataTypes.TEXT,
  languages: DataTypes.JSON,
  skills: DataTypes.JSON
}, {
  underscored: true,
  timestamps: false
});

// User.hasOne(VeteranDetails, { foreignKey: 'userId' });
// VeteranDetails.belongsTo(User, { foreignKey: 'userId' });

module.exports = VeteranDetails;
