const jwt = require('jsonwebtoken')
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
            const userId = req.user?.userId
            const usersCollection = await getUsersCollection()

            if (!req.user || !allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ message: "Access Denied: Insufficient permissions" });
            }

            if (req.user.role === "corporate_free") {
                if (req.user.resumeViews >= 5) {
                    return res.status(403).json({ message: "Resume view limit reached. Upgrade your plan." });
                }
                await usersCollection.updateOne({ userId }, { $inc: { resumeViews: 1 } });
            }

            next();
        } catch (error) {
            console.error("Authorization Error:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    };
}


module.exports = { 
    authenticateToken,
    authorizeRoles,
}