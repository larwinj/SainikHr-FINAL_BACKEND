const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const RestrictedDomain = sequelize.define('RestrictedDomain', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  underscored: true,
  timestamps: false,
});

module.exports = RestrictedDomain;