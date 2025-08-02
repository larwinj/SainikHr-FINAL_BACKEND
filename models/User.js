const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const User = sequelize.define('User', {
  userId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username: DataTypes.STRING,
  firstName: DataTypes.STRING,
  middleName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  email: { type: DataTypes.STRING},
  passwordHash: DataTypes.STRING,
  role: { type: DataTypes.ENUM('veteran', 'corporate', 'admin') },
  profilePictureUrl: DataTypes.STRING,
  preferences: DataTypes.JSON
}, {
  underscored: true,
  timestamps: true
});

module.exports = User;
