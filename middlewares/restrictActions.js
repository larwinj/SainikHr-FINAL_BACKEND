const { SubscribedPlan, User, CorporatePlan } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../utils/db');
const { getPlanAccess, setPlanAccess } = require('../utils/planAccessCache');
const RestrictedDomain = require('../models/RestrictedDomain');

// Helper to calculate next reset date (first of next month)
function nextMonthDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  return d;
}

// Helper to calculate video snapshot validity (7 days from now)
function videoValidUntil() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

const responseFormator = {
    'resumeView': 'Resume View',
    'resumeDownload': 'Resume Download',
    'profileVideoRequest': 'Profile Video Request',
    'jobPost': 'Job Post',
    'skillLocationFilters': 'Skill Location Filter',
    'matchCandidatesEmailing': 'Match Candidates Emailing',
}

// Middleware to restrict actions based on plan and domain
function restrictActions(actionType) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: No user found' });
      }

      // 1. Get user and subscription details
      const user = await User.findOne({ where: { userId } });
      const subscribedPlan = await SubscribedPlan.findOne({
        where: { userId },
        include: [{ model: CorporatePlan, attributes: ['planName', 'resume', 'profileVideo', 'jobPost', 'resumeCountLimit', 'profileVideoCountLimit', 'jobPostCountLimit', 'skillLocationFilters', 'matchCandidatesEmailing'] }],
      });

      if (!user || !subscribedPlan || !subscribedPlan.planId) {
        return res.status(403).json({ message: 'Access Denied: No active subscription' });
      }

      // 2. Check if subscription is expired
      const isExpired = subscribedPlan.expireAt && new Date(subscribedPlan.expireAt) < new Date();
      if (isExpired) {
        return res.status(403).json({ message: 'Access Denied: Subscription expired' });
      }

      // 3. Check domain restriction for Free Trial
      // const emailDomain = user.email.split('@')[1];
      // const restrictedDomain = await RestrictedDomain.findOne({ where: { domain: emailDomain } });
      // const isFreeTrial = subscribedPlan.CorporatePlan?.planName.toLowerCase() === 'free_trial';
      // if (isFreeTrial && restrictedDomain) {
      //   console.log(`Blocked free trial action for domain: ${emailDomain}, userId: ${userId}, action: ${actionType}`);
      //   return res.status(403).json({ message: 'Access Denied: Free trial not available for this domain' });
      // }

      // 4. Reset usage if period expired (monthly reset)
      const now = new Date();
      if (subscribedPlan.resetAt && new Date(subscribedPlan.resetAt) <= now) {
        await sequelize.transaction(async (t) => {
          await SubscribedPlan.update(
            {
              resumeViewCount: 0,
              profileVideoCount: 0,
              jobPostedCount: 0,
              resetAt: nextMonthDate(),
            },
            { where: { userId }, transaction: t }
          );
        });
        // Update in-memory subscribedPlan
        subscribedPlan.resumeViewCount = 0;
        subscribedPlan.profileVideoCount = 0;
        subscribedPlan.jobPostedCount = 0;
        subscribedPlan.resetAt = nextMonthDate();
      }

      // 5. Get plan limits from cache or DB
      let planAccess = getPlanAccess(subscribedPlan.planId);
      if (!planAccess) {
        const corporatePlan = subscribedPlan.CorporatePlan;
        if (!corporatePlan) {
          return res.status(403).json({ message: 'Access Denied: Invalid plan' });
        }
        planAccess = {
          resume: corporatePlan.resume,
          profileVideo: corporatePlan.profileVideo,
          jobPost: corporatePlan.jobPost,
          resumeCountLimit: corporatePlan.resumeCountLimit,
          profileVideoCountLimit: corporatePlan.profileVideoCountLimit,
          jobPostCountLimit: corporatePlan.jobPostCountLimit,
          skillLocationFilters: corporatePlan.skillLocationFilters,
          matchCandidatesEmailing: corporatePlan.matchCandidatesEmailing,
        };
        setPlanAccess(subscribedPlan.planId, planAccess);
      }

      // 6. Define action limits
      const usageLimits = {
        resumeView: {
          used: subscribedPlan.resumeViewCount || 0,
          allowed: planAccess.resumeCountLimit,
          enabled: planAccess.resume,
        },
        resumeDownload: {
          used: subscribedPlan.resumeViewCount || 0, // Same counter as views
          allowed: planAccess.resumeCountLimit,
          enabled: planAccess.resume,
        },
        profileVideoRequest: {
          used: subscribedPlan.profileVideoCount || 0,
          allowed: planAccess.profileVideoCountLimit,
          enabled: planAccess.profileVideo,
          validUntil: subscribedPlan.profileVideoRequestExpiry,
        },
        jobPost: {
          used: subscribedPlan.jobPostedCount || 0,
          allowed: planAccess.jobPostCountLimit,
          enabled: planAccess.jobPost,
        },
        skillLocationFilters: {
          used: 0, // No counter
          allowed: null,
          enabled: planAccess.skillLocationFilters,
        },
        matchCandidatesEmailing: {
          used: 0, // No counter
          allowed: null,
          enabled: planAccess.matchCandidatesEmailing,
        },
      };

      const action = usageLimits[actionType];
      if (!action) {
        console.log(actionType)
        console.log(responseFormator[actionType])
        return res.status(400).json({ message: `Invalid action type: ${responseFormator[actionType]}` });
      }

      // 7. Check if action is enabled
      if (!action.enabled) {
        return res.status(403).json({ message: `Action ${responseFormator[actionType]} not allowed for your plan` });
      }

      // 8. Check video snapshot validity for Premium
      if (actionType === 'profileVideoRequest' && action.validUntil && new Date(action.validUntil) < now) {
        return res.status(403).json({ message: 'Profile video request validity expired' });
      }

      // 9. Check if limit reached (null means unlimited)
      if (action.allowed !== null && action.used >= action.allowed) {
        return res.status(403).json({ message: `Plan limit reached for ${responseFormator[actionType]}. Upgrade to continue.` });
      }

      // 10. Increment usage (if applicable)
      const updateField = {
        resumeView: 'resumeViewCount',
        resumeDownload: 'resumeViewCount',
        profileVideoRequest: 'profileVideoCount',
        jobPost: 'jobPostedCount',
      }[actionType];

      if (updateField) {
        const updateData = { [updateField]: action.used + 1 };
        if (actionType === 'profileVideoRequest') {
          updateData.profileVideoRequestExpiry = videoValidUntil();
        }
        await sequelize.transaction(async (t) => {
          await SubscribedPlan.update(
            updateData,
            { where: { userId }, transaction: t }
          );
        });
      }

      // 11. Attach plan access to request for downstream use
      req.planAccess = planAccess;
      next();
    } catch (error) {
      console.error(`Action Restriction Error for ${actionType}:`, error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  };
}

module.exports = restrictActions;