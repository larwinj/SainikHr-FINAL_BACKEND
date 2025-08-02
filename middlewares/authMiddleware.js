const jwt = require("jsonwebtoken");
const planAccessCache = require("../utils/planAccessCache");
const { User, SubscribedPlan } = require("../models");

const secretKey = process.env.SECRET_KEY;

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
}

// Middleware to authorize user based on role and plan
function authorizeRoles(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const role = req.user?.role;

      if (allowedRoles.includes(role)) {
        return next();
      }

      // Admin role with dynamic access checks
      if (role === "admin") {
        const access = req.user || {};
        const hasPermission = allowedRoles.some((key) => access[key]);
        if (!hasPermission) {
          return res
            .status(403)
            .json({
              message: "Access Denied: You do not have required permissions",
            });
        }
        return next();
      }

      // Corporate plan-based permission checks
      if (role === "corporate") {
        const user = req.user;

        // Fetch plan data from SubscribedPlan
        const subscribedPlan = await SubscribedPlan.findOne({
          where: { userId: user.userId },
        });
        if (
          !subscribedPlan ||
          !subscribedPlan.planId ||
          !subscribedPlan.expiredAt
        ) {
          console.log("access denied: missing plan data or user");
          return res
            .status(403)
            .json({ message: "Access Denied: Missing plan data or user" });
        }

        const isExpired = new Date(subscribedPlan.expiredAt) < new Date();
        if (isExpired) {
          return res
            .status(403)
            .json({ message: "Access Denied: Plan has expired" });
        }

        const planAccess = planAccessCache.getPlanAccess(subscribedPlan.planId);
        if (!planAccess) {
          return res
            .status(403)
            .json({ message: "Access Denied: Invalid plan" });
        }

        const usageLimits = {
          resume: {
            used: subscribedPlan.resumeViewCount || 0,
            allowed: planAccess.resumeCountLimit,
          },
          profileVideo: {
            used: subscribedPlan.profileVideoCount || 0,
            allowed: planAccess.profileVideoCountLimit,
          },
          jobPost: {
            used: subscribedPlan.jobPostedCount || 0,
            allowed: planAccess.jobPostCountLimit,
          },
        };

        console.log("allowedRoles:", allowedRoles);
        const hasPermission = allowedRoles.every((key) => {
          const planEnabled = planAccess[key] === true;
          const withinLimit = usageLimits[key]
            ? usageLimits[key].used < usageLimits[key].allowed
            : true;
          console.log(
            `key: ${key}, planEnabled: ${planEnabled}, withinLimit: ${withinLimit}`
          );
          return planEnabled && withinLimit;
        });
        if (!hasPermission) {
          console.log(
            "access denied: plan limit reached or permission missing"
          );
          return res
            .status(403)
            .json({
              message:
                "Access Denied: Plan limit reached or permission missing",
            });
        }

        return next();
      }

      return res
        .status(403)
        .json({ message: "Access Denied: Unauthorized Role" });
    } catch (error) {
      console.error("Authorization Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
};
