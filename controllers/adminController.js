// const dbModel = require("../models/dbModels")
const planAccessCache = require('../utils/planAccessCache')
const { v4: uuidv4 } = require("uuid")
const { 
    CorporatePlan,
    User, 
    Job,
    AdminAccess, 
    CorporateDetails,
    Access
 } = require("../models");

async function createOrUpdatePlan(req, res) {
  try {
    const data = req.body;
    const planId = req.query?.planId;

    let message;

    if (planId) {
      const existingPlan = await CorporatePlan.findOne({ where: { planId } });

      if (!existingPlan) {
        return res.status(404).json({ message: "The Plan doesn't exist" });
      }

      await existingPlan.update({
        planName: data.planName,
        profileVideo: data.access?.profileVideo,
        profileVideoCountLimit: data.access?.profileVideoCountLimit,
        resume: data.access?.resume,
        resumeCountLimit: data.access?.resumeCountLimit,
        jobPost: data.access?.jobPost,
        jobPostCountLimit: data.access?.jobPostCountLimit,
        durationValue: data.duration?.value,
        durationUnit: data.duration?.unit,
        rate: data.cost?.rate,
        currency: data.cost?.currency
      });

      message = "Corporate plan updated successfully";
    } else {
      await CorporatePlan.create({
        planId: uuidv4(),
        planName: data.planName,
        profileVideo: data.access?.profileVideo,
        profileVideoCountLimit: data.access?.profileVideoCountLimit,
        resume: data.access?.resume,
        resumeCountLimit: data.access?.resumeCountLimit,
        jobPost: data.access?.jobPost,
        jobPostCountLimit: data.access?.jobPostCountLimit,
        durationValue: data.duration?.value,
        durationUnit: data.duration?.unit,
        rate: data.cost?.rate,
        currency: data.cost?.currency
      });

      message = "Corporate plan inserted successfully";
    }

    // Refresh in-memory cache
    planAccessCache.loadCorporatePlans();

    return res.status(200).json({ message });

  } catch (error) {
    console.error("Error inserting or updating corporate plan: ", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function deletePlan(req, res) {
  try {
    const planId = req.query?.planId;

    if (!planId) {
      return res.status(400).json({ message: "Plan ID is required" });
    }

    const existingPlan = await CorporatePlan.findOne({ where: { planId } });

    if (!existingPlan) {
      return res.status(404).json({ message: "The Plan doesn't exist" });
    }

    await CorporatePlan.destroy({ where: { planId } });

    // Refresh cached plans
    planAccessCache.loadCorporatePlans();

    return res.status(200).json({ message: `The Plan ${existingPlan.planName} is deleted` });

  } catch (error) {
    console.error("Error deleting corporate plan: ", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getPlans(req, res) {
  try {
    const { page = 1, limit = 10, planId } = req.query;
    const user = req.user;

    // Build query attributes based on user role
    const attributes =
      !user || user.role !== "admin" || user?.managePlans !== true
        ? { exclude: ["createdAt", "updatedAt"] }
        : { exclude: [] };

    if (planId) {
      const plan = await CorporatePlan.findOne({
        where: { planId },
        attributes,
      });

      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      return res.status(200).json({
        message: "Corporate Plan Retrieved Successfully",
        plan,
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count: totalPlans, rows: plans } = await CorporatePlan.findAndCountAll({
      attributes,
      offset,
      limit: parseInt(limit),
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      message: "Corporate Plans Retrieved Successfully",
      plans,
      totalPlans,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPlans / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error fetching corporate plans: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function verifyCorporate(req, res) {
  try {
    const userId = req.query?.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const existingUser = await CorporateDetails.findOne({ where: { userId } });

    if (!existingUser) {
      return res.status(404).json({ message: "The User doesn't exist" });
    }

    const newStatus = !existingUser.verified;

    console.log(existingUser)
    console.log(newStatus)

    // Update CorporateDetails.verified
    await CorporateDetails.update(
      { verified: newStatus },
      { where: { userId } }
    );

    // Update all jobs posted by this corporate
    await Job.update(
      { postedByVerified: newStatus },
      { where: { userId } }
    );

    const message = newStatus
      ? "The User is verified successfully"
      : "The User is revoked successfully";

    return res.status(200).json({ message });
  } catch (error) {
    console.error("Error verifying user: ", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function deleteAdminAccount(req, res) {
  try {
    const requester = req.user; // currently logged-in admin
    const targetUserId = req.query?.userId;

    if (!targetUserId) {
      return res.status(400).json({ message: "Target user ID is required" });
    }

    // Find requester admin's access
    const requesterAccess = await AdminAccess.findOne({ where: { userId: requester.userId } });
    const targetUser = await User.findOne({ where: { userId: targetUserId } });

    if (!requester || requester.role !== "admin" || !requesterAccess?.manageAdmins || !targetUser) {
      return res.status(403).json({ message: "Unauthorized admin credentials" });
    }

    // Delete the user
    await User.destroy({ where: { userId: targetUserId } });

    // Optionally, log or archive the deletion elsewhere if needed
    // e.g., store in an "AuditLog" or "DeletedUsers" table

    return res.status(200).json({ message: "Account deleted by admin" });
  } catch (error) {
    console.error("Error Deleting Admin Account : ", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}


async function fetchAdmins(req, res) {
  try {
    const admin = req.user;
    const page = parseInt(req.query?.page) || 1;
    const limit = parseInt(req.query?.limit) || 10;
    const targetRole = req.query?.role;
    const offset = (page - 1) * limit;

    // Check if the requesting user is an admin
    if (admin.role !== 'admin') {
      return res.status(403).json({ message: "Only admins can access this endpoint." });
    }

    // Validate targetRole
    if (!targetRole || !['admin', 'corporate'].includes(targetRole)) {
      return res.status(400).json({ message: "Invalid or missing role parameter. Must be 'admin' or 'corporate'." });
    }

    // Check admin permissions
    const adminAccess = await AdminAccess.findOne({ where: { userId: admin.userId } });
    if (!adminAccess) {
      return res.status(403).json({ message: "No admin access found for this user." });
    }

    // Check permissions based on targetRole
    if (targetRole === 'admin' && !adminAccess.manageAdmins) {
      return res.status(403).json({ message: "You do not have permission to manage admin profiles." });
    }
    if (targetRole === 'corporate' && !adminAccess.verifyCorporates) {
      return res.status(403).json({ message: "You do not have permission to manage corporate profiles." });
    }

    // Verify CorporateDetails model exists for corporate role
    if (targetRole === 'corporate' && !CorporateDetails) {
      return res.status(500).json({ message: "CorporateDetails model is not defined. Please check server configuration." });
    }

    // Build the include array based on targetRole
    const includeModels = [];
    if (targetRole === 'admin') {
      includeModels.push({
        model: AdminAccess,
        as: 'AdminAccess',
        attributes: [
          'roleName',
          'manageAdmins',
          'manageUsers',
          'verifyCorporates',
          'manageJobs',
          'financialManagement',
          'managePlans'
        ],
        required: true
      });
    } else if (targetRole === 'corporate') {
      includeModels.push({
        model: CorporateDetails,
        as: 'CorporateDetail',
        attributes: [
          'companyName',
          'website',
          'gstNumber',
          'cinNumber',
          'panNumber',
          'incorporationDate',
          'businessType',
          'registeredAddress',
          'businessEmail',
          'businessPhone',
          'verified'
        ],
        required: true
      });
    }

    // Fetch users with their associated details
    const { count: total, rows: users } = await User.findAndCountAll({
      where: { role: targetRole },
      attributes: { 
        exclude: ['passwordHash'] 
      },
      include: includeModels,
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    // Format users based on their role
    const formattedUsers = users.map(user => {
      const userData = user.get({ plain: true });
      return {
        ...userData,
        lastLogin: user.updatedAt || null, // Using updatedAt as a proxy for lastLogin
        profileType: user.role,
        profileDetails: user.role === 'admin' ? userData.AdminAccess : userData.CorporateDetail
      };
    });

    return res.status(200).json({
      total,
      page,
      pageSize: limit,
      users: formattedUsers
    });

  } catch (error) {
    console.error("Error fetching profiles:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function updateAdminAccess(req, res) {
  try {
    const user = req.user;
    const userId = req.query?.userId;
    const data = req.body;

    const targetAdmin = await User.findOne({ where: { userId, role: 'admin' } });

    if (!targetAdmin) {
      return res.status(404).json({ message: "Target admin user not found." });
    }

    // Update AdminAccess
    await AdminAccess.upsert({
      userId,
      roleName: data.roleName,
      manageAdmins: data.access?.manageAdmins || false,
      manageUsers: data.access?.manageUsers || false,
      verifyCorporates: data.access?.verifyCorporates || false,
      manageJobs: data.access?.manageJobs || false,
      financialManagement: data.access?.financialManagement || false,
      managePlans: data.access?.managePlans || false
    });

    // Optional: update `updatedAt` on the user (if needed)
    await User.update(
      { updatedAt: new Date() },
      { where: { userId } }
    );

    return res.status(200).json({ message: "Admin access updated successfully." });

  } catch (error) {
    console.error("Error updating admin access:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
    createOrUpdatePlan,
    deletePlan,
    getPlans,
    verifyCorporate,
    deleteAdminAccount,
    updateAdminAccess,
    fetchAdmins
}