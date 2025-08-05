const { SubscribedPlan, User, CorporatePlan, CurrentSubscribedPlan } = require('../models');
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

      const user = await User.findOne({ where: { userId } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Fetch the current subscription from CurrentSubscribedPlan
      const currentSubscription = await CurrentSubscribedPlan.findOne({
        where: { userId },
        include: [
          {
            model: SubscribedPlan,
            include: [
              {
                model: CorporatePlan,
                attributes: [
                  'planName',
                  'resume',
                  'profileVideo',
                  'jobPost',
                  'resumeCountLimit',
                  'profileVideoCountLimit',
                  'jobPostCountLimit',
                  'skillLocationFilters',
                  'matchCandidatesEmailing',
                ],
              },
            ],
          },
        ],
      });

      // Check if there is an active subscription
      if (!currentSubscription || !currentSubscription.SubscribedPlan || !currentSubscription.SubscribedPlan.CorporatePlan) {
        return res.status(403).json({ message: 'Access Denied: No active subscription' });
      }

      const subscribedPlan = currentSubscription.SubscribedPlan;

      // Check if subscription is expired
      const isExpired = subscribedPlan.expireAt && new Date(subscribedPlan.expireAt) < new Date();
      if (isExpired) {
        return res.status(403).json({ message: 'Access Denied: Subscription expired' });
      }

      // Reset usage if period expired (monthly reset)
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
            { where: { planId: subscribedPlan.planId }, transaction: t }
          );
        });
        // Update in-memory subscribedPlan
        subscribedPlan.resumeViewCount = 0;
        subscribedPlan.profileVideoCount = 0;
        subscribedPlan.jobPostedCount = 0;
        subscribedPlan.resetAt = nextMonthDate();
      }

      // Get plan limits from cache or DB
      let planAccess = getPlanAccess(subscribedPlan.planId);
      if (!planAccess) {
        const corporatePlan = subscribedPlan.CorporatePlan;
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

      // Define action limits
      const usageLimits = {
        resumeView: {
          used: subscribedPlan.resumeViewCount || 0,
          allowed: planAccess.resumeCountLimit,
          enabled: planAccess.resume,
        },
        resumeDownload: {
          used: subscribedPlan.resumeViewCount || 0,
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
          used: 0,
          allowed: null,
          enabled: planAccess.skillLocationFilters,
        },
        matchCandidatesEmailing: {
          used: 0,
          allowed: null,
          enabled: planAccess.matchCandidatesEmailing,
        },
      };

      const action = usageLimits[actionType];
      if (!action) {
        return res.status(400).json({ message: `Invalid action type: ${actionType}` });
      }

      // Validate skillLocationFilters query parameters
      if (actionType === 'skillLocationFilters'&& !action.enabled ) {
        const { skillsMatch, location } = req.query;
        if (skillsMatch || location) {
          return res.status(400).json({ message: 'Invalid query: SkillsMatch or Location parameters are not allowed' });
        }
      }

      // Check video snapshot validity for profileVideoRequest
      if (actionType === 'profileVideoRequest' && action.validUntil && new Date(action.validUntil) < now) {
        return res.status(403).json({ message: 'Profile video request validity expired' });
      }

      // Check if limit reached (null means unlimited)
      if (action.allowed !== null && action.used >= action.allowed) {
        return res.status(403).json({ message: `Plan limit reached for ${responseFormator[actionType]}. Upgrade to continue.` });
      }

      // Increment usage (if applicable)
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
            { where: { planId: subscribedPlan.planId }, transaction: t }
          );
        });
      }

      // Attach plan access to request for downstream use
      req.planAccess = planAccess;
      next();
    } catch (error) {
      console.error(`Action Restriction Error for ${actionType}:`, error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  };
}

module.exports = restrictActions;