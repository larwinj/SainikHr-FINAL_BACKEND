const dbModel = require('../models/index.js');

const planAccessCache = new Map();
let lastLoaded = null;

async function loadCorporatePlans() {
    const { CorporatePlan } = dbModel;

    const plans = await CorporatePlan.findAll({
        attributes: [
            'planId',
            'profileVideo',
            'resume',
            'jobPost',
            'profileVideoCountLimit',
            'resumeCountLimit',
            'jobPostCountLimit'
        ]
    });

    planAccessCache.clear();
    plans.forEach(plan => {
        if (plan.planId) {
            planAccessCache.set(plan.planId, {
                profileVideo: plan.profileVideo,
                resume: plan.resume,
                jobPost: plan.jobPost,
                profileVideoCountLimit: plan.profileVideoCountLimit,
                resumeCountLimit: plan.resumeCountLimit,
                jobPostCountLimit: plan.jobPostCountLimit
            });
        }
    });

    lastLoaded = new Date();
}

function getPlanAccess(planId) {
    return planAccessCache.get(planId);
}

function getLastLoadedTime() {
    return lastLoaded;
}

module.exports = {
    loadCorporatePlans,
    getPlanAccess,
    getLastLoadedTime
};