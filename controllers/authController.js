const { generateOTP, sendOtpToEmail, generateOtpToken } = require("../utils/otpService")
const { verifyOtp } = require("../utils/otpService")
const JWTToken = require("../utils/jwtToken")
const passwordHasher = require("../utils/passwordHasher")
const { v4: uuidv4 } = require("uuid")
const {
  User,
  VeteranDetails,
  CorporateDetails,
  SubscribedPlan,
  AdminAccess,
  CorporatePlan,
} = require("../models");
const { json } = require("sequelize")
const { getPlanAccess } = require('../utils/planAccessCache');
const RestrictedDomain = require("../models/RestrictedDomain")

async function signUp(req, res) {
  try {
    const { userName, email, password, otp, role, ...other } = req.body;
    const data = req.user; // From OTP middleware, if applicable

    // Validate input
    if (!userName || !email || !password || !role || (role !== 'admin' && !otp)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['veteran', 'admin', 'corporate'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (role === 'corporate' && !req.query?.planId) {
      return res.status(400).json({ message: 'planId is required for corporate users' });
    }

    // OTP verification for non-admin users
    if (role !== 'admin' && !verifyOtp(email, otp, data)) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    // Check for existing user
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(403).json({ message: 'User with this email already exists' });
    }

    // Enforce one-free-trial-per-domain for corporate Free Trial
    const planId = req.query?.planId;
    if (role === 'corporate') {
      const plan = await CorporatePlan.findOne({ where: { planId } });
      if (!plan) {
        return res.status(400).json({ message: 'Invalid planId' });
      }
      // if (plan.planName === 'free_trial') {
      //   const domain = email.split('@')[1];
      //   const existingDomain = await RestrictedDomain.findOne({ where: { domain } });
      //   if (existingDomain) {
      //     return res.status(403).json({ message: 'Free trial already used for this domain' });
      //   }
      // }
    }

    const hashedPassword = await passwordHasher.hashPassword(password);

    // Start database transaction
    const transaction = await User.sequelize.transaction();
    try {
      const newUser = await User.create(
        {
          userId: uuidv4(),
          username: userName,
          email,
          passwordHash: hashedPassword,
          role,
        },
        { transaction }
      );

      let token;

      if (role === 'veteran') {
        await VeteranDetails.create({ userId: newUser.userId }, { transaction });
        token = JWTToken(
          {
            userId: newUser.userId,
            role,
          },
          '1d'
        );
      } else if (role === 'admin') {
        const adminAccess = {
          userId: newUser.userId,
          roleName: other.roleName || 'admin',
          manageAdmins: other.manageAdmins || false,
          manageUsers: other.manageUsers || false,
          verifyCorporates: other.verifyCorporates || false,
          manageJobs: other.manageJobs || false,
          financialManagement: other.financialManagement || false,
          managePlans: other.managePlans || false,
        };
        await AdminAccess.create(adminAccess, { transaction });
        token = JWTToken(
          {
            userId: newUser.userId,
            role,
            manageAdmins: adminAccess.manageAdmins,
            manageUsers: adminAccess.manageUsers,
            verifyCorporates: adminAccess.verifyCorporates,
            manageJobs: adminAccess.manageJobs,
            financialManagement: adminAccess.financialManagement,
            managePlans: adminAccess.managePlans,
          },
          '1d'
        );
      } else if (role === 'corporate') {
        const plan = await CorporatePlan.findOne({ where: { planId } }); // Already validated
        const subscribedAt = new Date();
        let expireAt = null;
        let profileVideoRequestExpiry = null;

        if (plan.durationValue && plan.durationUnit) {
          const durationValue = Number(plan.durationValue);
          const durationUnit = plan.durationUnit.toLowerCase();
          expireAt = new Date(subscribedAt);
          switch (durationUnit) {
            case 'days':
              expireAt.setDate(expireAt.getDate() + durationValue);
              break;
            case 'weeks':
              expireAt.setDate(expireAt.getDate() + durationValue * 7);
              break;
            case 'months':
              expireAt.setMonth(expireAt.getMonth() + durationValue);
              break;
            case 'years':
              expireAt.setFullYear(expireAt.getFullYear() + durationValue);
              break;
          }
        }

        if (plan.planName.includes('premium') && plan.profileVideo) {
          profileVideoRequestExpiry = new Date(subscribedAt);
          profileVideoRequestExpiry.setDate(profileVideoRequestExpiry.getDate() + 7);
        }

        await CorporateDetails.create(
          {
            userId: newUser.userId,
            companyName: other.companyName || '',
            verified: false,
            website: other.website || '',
            gstNumber: other.gstNumber || '',
            cinNumber: other.cinNumber || '',
            panNumber: other.panNumber || '',
            incorporationDate: other.incorporationDate || null,
            businessType: other.businessType || '',
            registeredAddress: other.registeredAddress || '',
            businessEmail: other.businessEmail || '',
            businessPhone: other.businessPhone || '',
          },
          { transaction }
        );

        await SubscribedPlan.create(
          {
            userId: newUser.userId,
            planId,
            planName: plan.planName,
            subscribedAt,
            expireAt,
            resumeViewCount: 0,
            profileVideoCount: 0,
            jobPostedCount: 0,
            profileVideoRequestExpiry,
            resetAt: new Date(new Date().setDate(1)), // First of current month
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { transaction }
        );

        // Add domain to RestrictedDomain for Free Trial
        // if (plan.planName === 'free_trial') {
        //   await RestrictedDomain.upsert(
        //     {
        //       domain: email.split('@')[1],
        //       createdAt: new Date(),
        //       updatedAt: new Date(),
        //     },
        //     { transaction }
        //   );
        // }

        const planAccess = getPlanAccess(planId) || {
          profileVideo: plan.profileVideo,
          resume: plan.resume,
          jobPost: plan.jobPost,
          skillLocationFilters: plan.skillLocationFilters,
          matchCandidatesEmailing: plan.matchCandidatesEmailing,
        };

        token = JWTToken(
          {
            userId: newUser.userId,
            role,
            planId,
            access: {
              profileVideo: planAccess.profileVideo,
              resume: planAccess.resume,
              jobPost: planAccess.jobPost,
              skillLocationFilters: planAccess.skillLocationFilters,
              matchCandidatesEmailing: planAccess.matchCandidatesEmailing,
              profileVideoRequestExpiry,
            },
          },
          '1d'
        );
      }

      await transaction.commit();

      return res.status(201).json({
        message: 'User registered successfully',
        userId: newUser.userId,
        username: newUser.username,
        email: newUser.email,
        token,
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error Signup:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  } catch (error) {
    console.error('Error Signup:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

async function logIn(req, res) {
  try {
    const { email, password, role } = req.body;

    const existingUser = await User.findOne({ where: { email } });

    if (!existingUser) {
      return res.status(404).json({ message: 'User does not exist!' });
    }

    if (existingUser.role !== role) {
      return res.status(401).json({ message: 'Unauthorized login' });
    }

    const valid = await passwordHasher.verifyPassword(password, existingUser.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid Email or Password' });
    }

    let token;

    if (existingUser.role === 'veteran') {
      token = JWTToken(
        {
          userId: existingUser.userId,
          role: existingUser.role,
        },
        '1d'
      );
    } else if (existingUser.role === 'corporate') {
      const planData = await SubscribedPlan.findOne({
        where: { userId: existingUser.userId },
      });

      if (!planData) {
        return res.status(403).json({ message: 'No active subscription found' });
      }

      const planAccess = getPlanAccess(planData.planId) || (
        await CorporatePlan.findOne({ where: { planId: planData.planId } })
      ).dataValues;

      token = JWTToken(
        {
          userId: existingUser.userId,
          role: existingUser.role,
          planId: planData?.planId,
          access: {
            profileVideo: planAccess.profileVideo,
            resume: planAccess.resume,
            jobPost: planAccess.jobPost,
            skillLocationFilters: planAccess.skillLocationFilters,
            matchCandidatesEmailing: planAccess.matchCandidatesEmailing,
            profileVideoRequestExpiry: planData.profileVideoRequestExpiry,
          },
        },
        '1d'
      );
    } else if (existingUser.role === 'admin') {
      const access = await AdminAccess.findOne({
        where: { userId: existingUser.userId },
      });

      token = JWTToken(
        {
          userId: existingUser.userId,
          role: existingUser.role,
          manageAdmins: access?.manageAdmins,
          manageUsers: access?.manageUsers,
          verifyCorporates: access?.verifyCorporates,
          manageJobs: access?.manageJobs,
          financialManagement: access?.financialManagement,
          managePlans: access?.managePlans,
        },
        '1d'
      );
    }

    return res.status(200).json({
      message: 'Login successful',
      userId: existingUser.userId,
      username: existingUser.username,
      email: existingUser.email,
      role: existingUser.role,
      token,
    });
  } catch (error) {
    console.error('Error Login:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

async function deleteAccount(req, res) {   
  try {
    const user = req.user; // decoded JWT payload
    const userIdToDelete = req.query?.userId;
    const password = req.query?.password;

    // Admin-triggered deletion
    if (password && userIdToDelete) {
      const adminUser = await User.findOne({ where: { userId: user.userId } });
      const access = await AdminAccess.findOne({ where: { userId: user.userId } });
      const targetUser = await User.findOne({ where: { userId: userIdToDelete } });

      if (
        !adminUser ||
        adminUser.role !== "admin" ||
        !access?.manageUsers ||
        !targetUser
      ) {
        return res.status(403).json({ message: "Unauthorized admin credentials" });
      }

      const isAdminPasswordValid = await passwordHasher.verifyPassword(password, adminUser.passwordHash);
      if (!isAdminPasswordValid) {
        return res.status(401).json({ message: "Invalid admin password" });
      }

      await User.destroy({ where: { userId: userIdToDelete } });
      return res.status(200).json({ message: "Account deleted by admin" });
    }

    // Self-deletion
    const existingUser = await User.findOne({ where: { userId: user.userId } });

    if (!existingUser) {
      return res.status(404).json({ message: "User does not exist!" });
    }

    await User.destroy({ where: { userId: user.userId } });
    return res.status(200).json({ message: "Account deleted successfully" });

  } catch (error) {
    console.error("Error Deleting Account:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, otp, password } = req.body;
    const tokenPayload = req.user; // Comes from verified OTP token middleware ck

    const existingUser = await User.findOne({ where: { email } });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!verifyOtp(email, otp, tokenPayload)) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    const hashedPassword = await passwordHasher.hashPassword(password);

    await User.update(
      {
        passwordHash: hashedPassword,
        updatedAt: new Date()
      },
      { where: { email } }
    );

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
async function sendOTP(req, res) {
  try {
    const email = req.query?.email;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = generateOTP();
    const companyName = req.query?.companyName;
    // Capture IP address from the request (with fallback for proxies)
    const ipAddress =
    req.query?.ip ||
    null;
    console.log('Captured IP:', ipAddress); // Debug log - check your server console

    // Send email with IP included
    await sendOtpToEmail(email, otp, ipAddress);
    
    // Generate token with IP included
    const token = generateOtpToken(email, otp, ipAddress);

    return res.status(200).json({ message: "OTP Generated Successfully", token , ipAddress });
  } catch (error) {
    console.error("Error OTP generation:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}


async function googleRedirect(req, res) {
  try {
    const token = req.user.token;
    res.redirect(`/veteran?token=${token}`);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getUserRoleFromToken (req, res) {
   try {
    if (!req.user || !req.user.role) {
      return res.status(400).json({ message: "Invalid token payload" });
    }

    return res.status(200).json({
      role: req.user.role
    });
  } catch (error) {
    console.error("Error getting user role:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
    signUp,
    logIn,
    deleteAccount,
    resetPassword,
    sendOTP,
    googleRedirect,
    getUserRoleFromToken
}