const jwt = require('jsonwebtoken')
const planAccessCache = require('../utils/planAccessCache')
const { getUsersCollection } = require('../models/dbModels')

const secretKey = process.env.SECRET_KEY

function authenticateToken(req, res, next) {
    const token = req.header("Authorization")?.split(" ")[1]

    if (!token) return res.status(401).json({ message: "Access denied. No token provided." })
    try {
        const decoded = jwt.verify(token, secretKey)
        req.user = decoded;
        next(); 
    } catch (error) {
        return res.status(403).json({ message: "Invalid token" });
    }
}

function authorizeRoles(...allowedRoles) {
    return async (req, res, next) => {
        
        try {
            if (allowedRoles.includes(req.user.role)) {
                return next()
            }

            if (req.user && req.user.role === 'admin') {
                const access = req.user || {}
                const hasPermission = allowedRoles.some(key => access[key])
                if (!hasPermission) {
                    return res.status(403).json({ message: "Access Denied: You do not have required permissions" })
                }
                return next()
            } 


            if (req.user.role === 'corporate') {

                const user = req.user
                const usersCollection = await getUsersCollection()
                const exisitingUser = await usersCollection.findOne({ userId: user.userId })

                if (!user?.planId || !user?.expireAt || !exisitingUser) {
                    return res.status(403).json({ message: "Access Denied: Missing plan data or user" })
                }

                const isExpired = new Date(user.expireAt) < new Date()
                if (isExpired) {
                    return res.status(403).json({ message: "Access Denied: Plan has expired" })
                }

                const planAccess = planAccessCache.getPlanAccess(user.planId)
                if (!planAccess) {
                    return res.status(403).json({ message: "Access Denied: Invalid plan" })
                }

                const usageLimits = {
                    resume: {
                        used: exisitingUser?.planData?.resumeViewCount || 0,
                        allowed: planAccess.resumeCountLimit,
                    },
                    profileVideo: {
                        used: exisitingUser?.planData?.profileVideoViewCount || 0,
                        allowed: planAccess.profileVideoCountLimit,
                    },
                    jobPost: {
                        used: exisitingUser?.planData?.jobPostedCount || 0,
                        allowed: planAccess.jobPostCountLimit,
                    },
                }

                

                const hasPermission = allowedRoles.every(key => {
                    console.log(key + "idhu")
                    const planEnabled = planAccess[key] === true
                    const withinLimit = usageLimits[key]
                        ? usageLimits[key].used < usageLimits[key].allowed
                        : true
                    return planEnabled && withinLimit
                });
                console.log(hasPermission)
                if (!hasPermission) {
                    console.log(usageLimits)
                    return res.status(403).json({ message: "Access Denied: Plan limit reached or permission missing" })
                }

                return next()
            } 
            return res.status(403).json({ message: "Access Denied: Unauthorized Role" })
        } catch (error) {
            console.error("Authorization Error:", error)
            res.status(500).json({ message: "Internal Server Error" })
        }
    };
}


module.exports = { 
    authenticateToken,
    authorizeRoles,
}