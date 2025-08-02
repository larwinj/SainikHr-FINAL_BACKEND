const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');
const User = require('./User');

const CorporateDetails = sequelize.define('CorporateDetails', {
  userId: { type: DataTypes.UUID, primaryKey: true },
  companyName: DataTypes.STRING,
  website: DataTypes.STRING,
  verified: DataTypes.BOOLEAN,
  gstNumber: DataTypes.STRING,
  cinNumber: DataTypes.STRING,
  panNumber: DataTypes.STRING,
  incorporationDate: DataTypes.DATE,
  businessType: DataTypes.STRING,
  registeredAddress: DataTypes.TEXT,
  businessEmail: DataTypes.STRING,
  businessPhone: DataTypes.STRING
}, {
  underscored: true,
  timestamps: false
});

// User.hasOne(CorporateDetails, { foreignKey: 'userId' });
// CorporateDetails.belongsTo(User, { foreignKey: 'userId' });

module.exports = CorporateDetails;
