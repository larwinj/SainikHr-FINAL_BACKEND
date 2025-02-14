const jwt = require('jsonwebtoken')

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
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied. Insufficient permissions." });
        }
        next();
    };
}

module.exports = { 
    authenticateToken,
    authorizeRoles
}