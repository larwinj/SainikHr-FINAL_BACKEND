const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Application = sequelize.define('Application', {
  applicationId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: DataTypes.UUID,
  corporateId: DataTypes.UUID,
  jobId: DataTypes.UUID,
  resumeId: DataTypes.UUID,
  userMatched: DataTypes.BOOLEAN,
  corporateMatched: DataTypes.BOOLEAN,
  profileVideoUrl: DataTypes.STRING,
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: {
        msg: 'Status must be an integer', // Custom message for isInt
      },
      min: {
        args: [100],
        msg: 'Status must be at least 100', // Custom message for min
      },
      max: {
        args: [105],
        msg: 'Status must not exceed 105', // Custom message for max
      },
    },
  },
  appliedAt: DataTypes.DATE,
  expiredAt: DataTypes.DATE,
}, {
  underscored: true,
  timestamps: true,
});

module.exports = Application;