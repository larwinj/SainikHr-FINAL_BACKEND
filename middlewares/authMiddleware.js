const jwt = require('jsonwebtoken')

const secretKey = process.env.SECRET_KEY

function authenticateToken(req, res, next) {
    const token = req.cookies.jwt; 

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
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied. Insufficient permissions." });
        }
        next();
    };
}

function authorizeSubscription(...allowedSubscriptions) {
    return(req,res,next) => {
        if(!req.user || !allowedSubscriptions.includes(req.user.subscription)) {
            return res.status(402).json({ message: "Access denied. Payment Required." })
        }
        next()
    }
}

module.exports = { 
    authenticateToken,
    authorizeRoles
}