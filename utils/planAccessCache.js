const dbModel = require('../models/dbModels')

const planAccessCache = new Map()
let lastLoaded = null

async function loadCorporatePlans() {
    const collection = await dbModel.getCorporatePlansCollection()
    const plans = await collection.find({}).toArray()

    planAccessCache.clear()
    plans.forEach(plan => {
        if (plan.planId && plan.access) {
            planAccessCache.set(plan.planId, plan.access)
        }
    });

    lastLoaded = new Date()
}

function getPlanAccess(planId) {
    return planAccessCache.get(planId)
}

function getLastLoadedTime() {
    return lastLoaded
}

module.exports = {
    loadCorporatePlans,
    getPlanAccess,
    getLastLoadedTime,
}
