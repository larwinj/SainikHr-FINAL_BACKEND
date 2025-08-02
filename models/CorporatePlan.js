const { DataTypes } = require("sequelize");
const { sequelize } = require("../utils/db");

const CorporatePlan = sequelize.define(
  "CorporatePlan",
  {
    planId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: "Unique identifier for the plan",
    },
    planName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment:
        "Name of the plan (e.g., Free Trial, Standard Monthly, Premium Yearly)",
    },
    profileVideo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether profile video access is enabled",
    },
    profileVideoCountLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Limit on profile video requests (null for unlimited)",
    },
    resume: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether resume access is enabled",
    },
    resumeCountLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Limit on resume views/downloads (null for unlimited)",
    },
    jobPost: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether job posting is enabled",
    },
    jobPostCountLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Limit on job posts (null for unlimited)",
    },
    skillLocationFilters: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether skill/location filters are enabled",
    },
    matchCandidatesEmailing: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether candidate emailing is enabled",
    },
    durationValue: {
      type: DataTypes.INTEGER, // Changed to INTEGER to match data (1, 12)
      allowNull: false,
      comment:
        "Duration value of the plan (e.g., 1 for monthly, 12 for yearly)",
    },
    durationUnit: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["day", "week", "month", "year"]], // Restrict to valid units
      },
      comment: "Unit of duration (e.g., day, week, month, year)",
    },
    rate: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      comment: "Cost of the plan (e.g., 0 for free, 1100 for Standard Monthly)",
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["INR", "USD", "EUR"]], // Restrict to supported currencies
      },
      comment: "Currency of the plan (e.g., INR, USD)",
    },
    isPopular: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment:
        "Whether the plan is marked as popular (e.g., for Premium plans)",
    },
    description: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Description of the plan (e.g., Perfect for testing our platform)'
  },
  },
  {
    underscored: true,
    timestamps: true,
    tableName: "corporate_plans",
    comment:
      "Stores corporate plan details for subscription-based access control",
  }
);

module.exports = CorporatePlan;
