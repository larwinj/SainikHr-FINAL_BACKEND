const { sequelize } = require('../utils/db');

// === Model Imports ===
const User = require('./User');
const VeteranDetails = require('./VeteranDetails');
const CorporateDetails = require('./CorporateDetails');
const CorporatePlan = require('./CorporatePlan');
const SubscribedPlan = require('./SubscribedPlan');
const AdminAccess = require('./AdminAccess');
const Resume = require('./Resume');
const ResumeEducation = require('./ResumeEducation');
const ResumeExperience = require('./ResumeExperience');
const ResumeProjects = require('./ResumeProjects');
const Job = require('./Job');
const Application = require('./Application');
const SavedJob = require('./SavedJob');
const Access = require('./Access');
const JobViewsApplications = require('./JobViewsApplications');
const CurrentSubscribedPlan = require('./CurrentSubscribedPlan')
// === Associations ===

// -- User → Details --
User.hasOne(VeteranDetails, { foreignKey: 'userId' });
VeteranDetails.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(CorporateDetails, { foreignKey: 'userId' });
CorporateDetails.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(AdminAccess, { foreignKey: 'userId' });
AdminAccess.belongsTo(User, { foreignKey: 'userId' });

// -- User ↔ Resumes --
User.hasMany(Resume, { foreignKey: 'userId' });
Resume.belongsTo(User, { foreignKey: 'userId' });

// -- Resume Sub Tables --
Resume.hasMany(ResumeEducation, { foreignKey: 'resumeId', as: 'education' });
ResumeEducation.belongsTo(Resume, { foreignKey: 'resumeId' });

Resume.hasMany(ResumeExperience, { foreignKey: 'resumeId', as: 'workExperience' });
ResumeExperience.belongsTo(Resume, { foreignKey: 'resumeId' });

Resume.hasMany(ResumeProjects, { foreignKey: 'resumeId', as: 'projects' });
ResumeProjects.belongsTo(Resume, { foreignKey: 'resumeId' });

// -- User ↔ Jobs Posted --
User.hasMany(Job, { foreignKey: 'userId' });
Job.belongsTo(User, { foreignKey: 'userId' });

// -- Job ↔ Applications --
Job.hasMany(Application, { foreignKey: 'jobId' });
Application.belongsTo(Job, { foreignKey: 'jobId' });

User.hasMany(Application, { foreignKey: 'userId' });
Application.belongsTo(User, { foreignKey: 'userId' });

Resume.hasMany(Application, { foreignKey: 'resumeId' });
Application.belongsTo(Resume, { foreignKey: 'resumeId' });

CorporateDetails.hasMany(Application, { foreignKey: 'corporateId' });
Application.belongsTo(CorporateDetails, { foreignKey: 'corporateId' });

// -- Subscribed Plan --
User.hasOne(SubscribedPlan, { foreignKey: 'userId' });
SubscribedPlan.belongsTo(User, { foreignKey: 'userId' });

CorporatePlan.hasMany(SubscribedPlan, { foreignKey: 'planId' });
SubscribedPlan.belongsTo(CorporatePlan, { foreignKey: 'planId' });

// -- Saved Jobs --
User.hasMany(SavedJob, { foreignKey: 'userId' });
SavedJob.belongsTo(User, { foreignKey: 'userId' });

Job.hasMany(SavedJob, { foreignKey: 'jobId' });
SavedJob.belongsTo(Job, { foreignKey: 'jobId' });

// CorporatePlan.belongsTo(Duration, { foreignKey: 'durationId' });
// Duration.hasMany(CorporatePlan, { foreignKey: 'durationId' });

CorporatePlan.hasMany(Access, { foreignKey: 'planId' });
Access.belongsTo(CorporatePlan, { foreignKey: 'planId' });

User.hasOne(Access, { foreignKey: 'userId' });
Access.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(JobViewsApplications, { foreignKey: 'userId', as: 'JobViewsApplications' });
JobViewsApplications.belongsTo(User, { foreignKey: 'userId' });

Job.hasMany(JobViewsApplications, { foreignKey: 'jobId', as: 'JobViewsApplications' });
JobViewsApplications.belongsTo(Job, { foreignKey: 'jobId' });
CorporateDetails.hasOne(CurrentSubscribedPlan, { foreignKey: 'userId' });
CurrentSubscribedPlan.belongsTo(CorporateDetails, { foreignKey: 'userId' });
CurrentSubscribedPlan.belongsTo(SubscribedPlan, { foreignKey: 'subscriptionId', targetKey: 'id' });


// === Export Models ===
module.exports = {
  sequelize,
  User,
  VeteranDetails,
  CorporateDetails,
  CorporatePlan,
  SubscribedPlan,
  AdminAccess,
  Resume,
  Access,
  ResumeEducation,
  ResumeExperience,
  ResumeProjects,
  Job,
  Application,
  SavedJob,
  JobViewsApplications,
  CorporateDetails, CurrentSubscribedPlan, SubscribedPlan
};
