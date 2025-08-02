const { v4: uuidv4 } = require("uuid")
const JWTToken = require("../utils/jwtToken")
const Op = require("sequelize").Op;
const geolib = require("geolib");
const { getLatLngForLocation, getNearbyCities } = require("../utils/geoUtils");
const NodeGeocoder = require('node-geocoder');
const path = require('path');
const fs = require('fs'); // Added for createWriteStream
const fsPromises = require('fs').promises;
const { generateResume } = require('../utils/generateResume');

// const dbModel = require("../models")
const {
  User,
  VeteranDetails,
  CorporatePlan,
  Job,
  Resume,
  Application,
  CorporateDetails,
  JobViewsApplications,
  ResumeExperience,
  ResumeEducation,
  ResumeProjects,
  SubscribedPlan,
  sequelize,
  Access
} = require("../models");
const { sendMutualMatchEmail } = require("../utils/otpService");

const geocoder = NodeGeocoder({
  provider: 'google',
  apiKey: process.env.GOOGLE_MAP_KEY,  // 🔁 replace with your actual key
});
async function subscription(req, res) {
  try {
    const userId = req.user?.userId;
    const planId = req.query?.planId;

    const existingUser = await User.findOne({ where: { userId } });
    const plan = await CorporatePlan.findOne({ where: { planId } });

    if (!plan || !existingUser || existingUser.role !== 'corporate') {
      return res.status(403).json({ message: "Plan or Corporate User doesn't exist" });
    }

    const subscribedAt = new Date();
    let expireAt = null;
    let planName = plan.planName;

    if (plan.durationValue && plan.durationUnit) {
      const durationValue = Number(plan.durationValue);
      const durationUnit = plan.durationUnit.toLowerCase();
      expireAt = new Date(subscribedAt);

      switch (durationUnit) {
        case "days":
          expireAt.setDate(expireAt.getDate() + durationValue);
          break;
        case "weeks":
          expireAt.setDate(expireAt.getDate() + durationValue * 7);
          break;
        case "months":
          expireAt.setMonth(expireAt.getMonth() + durationValue);
          break;
        case "years":
          expireAt.setFullYear(expireAt.getFullYear() + durationValue);
          break;
        default:
          console.warn("Unsupported duration unit");
          expireAt = null;
      }
    }

    await User.update(
      {
        planData: {
          planId,
          planName,
          resumeViewCount: 0,
          profileVideoViewCount: 0,
          jobPostedCount: 0,
          subscribedAt,
          expireAt,
        },
        updatedAt: new Date()
      },
      { where: { userId } }
    );

    const token = JWTToken(
      {
        userId,
        role: existingUser.role,
        planId,
        expireAt,
      },
      "1d"
    );

    return res.status(200).json({
      message: `Subscription upgraded to ${planName}`,
      token,
    });

  } catch (error) {
    console.error("Error in Subscription:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}


async function postOrUpdateJob(req, res) {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const data = req.body;
    const jobId = req.query?.jobId;

    const existingUser = await User.findOne({ where: { userId } });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    const corporateDetails = await CorporateDetails.findOne({ where: { userId } });
    if (userRole === "corporate" && !corporateDetails) {
      return res.status(404).json({ message: "Corporate profile not found!" });
    }

    // ------------------- Update Existing Job -------------------
    if (jobId) {
      const existingJob = await Job.findOne({ where: { jobId } });
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found!" });
      }

      await Job.update(
        {
          jobDescription: data.description,
          addressCity: data.address.city || "",
          addressState: data.address.state || "",
          contactPerson: {
            name: data.contactPerson?.name || "",
            position: data.contactPerson?.position || "",
            phone: data.contactPerson?.phone || ""
          },
          ...data,
          updatedAt: new Date()
        },
        { where: { jobId } }
      );

      return res.status(200).json({ message: "Job updated successfully" });
    }

    // ------------------- Post New Job -------------------
    const newJobId = uuidv4();

    const jobFormatted = {
      jobId: newJobId,
      userId,
      email:data.email,
      companyName: corporateDetails?.companyName || existingUser.username,
      jobDescription: data.description,
      role: data.role,
      jobType: data.jobType,
      industry: data.industry,
      companySize: data.companySize,
      website: data.website,
      addressCity: data.address.city || "",
      addressState: data.address.state || "",
      contactPerson: {
        name: data.contactPerson?.name || "",
        position: data.contactPerson?.position || "",
        phone: data.contactPerson?.phone || ""
      },
      requirements: data.requirements || [],
      salaryRange: data.salaryRange || [],
      postedMethod: userRole === "corporate" ? "private" : "public",
      dataViews: 0,
      dataApplied: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await Job.create(jobFormatted);

    return res.status(201).json({ message: "Job posted successfully" });

  } catch (error) {
    console.error("Error posting job: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}



async function deletePostedJob(req, res) {
  try {
    const jobId = req.query?.jobId;
    const userId = req.user?.userId;

    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    const existingJob = await Job.findOne({ where: { jobId } });

    if (!existingJob) {
      return res.status(404).json({ message: "The job doesn't exist" });
    }

    // If admin with permission deletes
    if (req.user?.role === "admin" && req.user?.manageJobs) {
      await Job.destroy({
        where: { jobId }
      });


      // Send email if the job is private
      try {
        await sendJobDeletionEmail(existingJob);
      } catch (emailError) {
        console.error('Failed to send job deletion email:', emailError);
        // Log the error but don't block the response
      }

      return res.status(200).json({ message: "The Posted Job is deleted Successfully" });
    }

    if (existingJob.userId !== userId) {
      console.log(userId, existingJob.userId);
      return res.status(403).json({ message: "You don't have permission to delete this job post" });
    }

    await Job.destroy({ where: { jobId } });

    const existingUser = await User.findOne({ where: { userId } });
    const updatedPostedJobs = (existingUser?.postedJobs || []).filter(id => id !== jobId);

    await User.update(
      {
        postedJobs: updatedPostedJobs,
        updatedAt: new Date()
      },
      { where: { userId } }
    );

    return res.status(200).json({ message: "The Posted Job is deleted Successfully" });

  } catch (error) {
    console.error("Error deleting job: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
async function getJobs(req, res) {
  try {
    const user = req.user;
    const jobIds = req.query?.jobId?.split(',').filter(Boolean) || [];
    const page = parseInt(req.query?.page) || 1;
    const limit = parseInt(req.query?.limit) || 10;
    const offset = (page - 1) * limit;

    const isAdmin = user?.role === "admin" && user?.manageJobs;

    // Define attributes to exclude
    const jobAttributes = {
      exclude: isAdmin ? [] : ['updatedAt', 'id']
    };

    // Define include for CorporateDetails and plan data
    const include = [
      {
        model: User,
        attributes: ['userId'], // Minimal user attributes
        include: [
          {
            model: CorporateDetails,
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
            ]
          },
          {
            model: Access,
            attributes: ['profileVideo', 'resume', 'jobPost', 'resumeCountLimit', 'profileVideoCountLimit', 'jobPostCountLimit'],
            include: [
              {
                model: CorporatePlan,
                attributes: ['planId', 'planName', 'rate', 'currency', 'durationValue', 'durationUnit']
              }
            ]
          }
        ]
      }
    ];

    if (jobIds.length === 1) {
      const jobId = jobIds[0];

      const job = await Job.findOne({
        where: { jobId },
        attributes: jobAttributes,
        include
      });

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Increment totalViews inside 'data' JSON column
      const jobData = job.data || {};
      jobData.totalViews = (jobData.totalViews || 0) + 1;

      await Job.update(
        { data: jobData },
        { where: { jobId } }
      );

      // Format the response to include corporate details and plan data
      const formattedJob = {
        ...job.toJSON(),
        companyName: job.User?.CorporateDetails?.companyName || '',
        website: job.User?.CorporateDetails?.website || '',
        gstNumber: job.User?.CorporateDetails?.gstNumber || '',
        cinNumber: job.User?.CorporateDetails?.cinNumber || '',
        panNumber: job.User?.CorporateDetails?.panNumber || '',
        incorporationDate: job.User?.CorporateDetails?.incorporationDate
          ? job.User.CorporateDetails.incorporationDate.toISOString()
          : '',
        businessType: job.User?.CorporateDetails?.businessType || '',
        registeredAddress: job.User?.CorporateDetails?.registeredAddress || '',
        businessEmail: job.User?.CorporateDetails?.businessEmail || '',
        businessPhone: job.User?.CorporateDetails?.businessPhone || '',
        verified: job.User?.CorporateDetails?.verified || false,
        planData: {
          planId: job.User?.Access?.CorporatePlan?.planId || '',
          planName: job.User?.Access?.CorporatePlan?.planName || 'Basic',
          rate: job.User?.Access?.CorporatePlan?.rate || 0,
          currency: job.User?.Access?.CorporatePlan?.currency || 'USD',
          resumeViewCount: job.User?.Access?.resumeCountLimit || 0,
          profileVideoViewCount: job.User?.Access?.profileVideoCountLimit || 0,
          jobPostedCount: job.User?.Access?.jobPostCountLimit || 0,
          profileVideoAccess: job.User?.Access?.profileVideo || false,
          resumeAccess: job.User?.Access?.resume || false,
          jobPostAccess: job.User?.Access?.jobPost || false,
          subscribedAt: job.User?.Access ? new Date().toISOString() : '', // Replace with actual subscription date if available
          expireAt: job.User?.Access && job.User?.Access?.CorporatePlan
            ? new Date(
                new Date().getTime() +
                (job.User.Access.CorporatePlan.durationUnit === 'days'
                  ? job.User.Access.CorporatePlan.durationValue * 24 * 60 * 60 * 1000
                  : job.User.Access.CorporatePlan.durationUnit === 'months'
                  ? job.User.Access.CorporatePlan.durationValue * 30 * 24 * 60 * 60 * 1000
                  : 0)
              ).toISOString()
            : ''
        }
      };

      return res.status(200).json({ job: formattedJob });
    }

    const whereClause = jobIds.length > 1
      ? { jobId: { [Op.in]: jobIds } }
      : {};

    const { count, rows: jobs } = await Job.findAndCountAll({
      where: whereClause,
      offset,
      limit,
      order: [['createdAt', 'DESC']],
      attributes: jobAttributes,
      include
    });

    // Format jobs to include corporate details and plan data
    const formattedJobs = jobs.map(job => ({
      ...job.toJSON(),
      
    }));

    return res.status(200).json({
      total: count,
      page,
      pageSize: limit,
      jobs: formattedJobs
    });

  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}


async function getProfile(req, res) {
  try {
    const user = req.user;

    // Fetch user data, excluding sensitive fields
    const existingUser = await User.findOne({
      where: { userId: user.userId },
      attributes: {
        exclude: ['id', 'passwordHash', 'userId', 'createdAt', 'updatedAt']
      }
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Fetch corporate details for the user
    const corporateDetails = await CorporateDetails.findOne({
      where: { userId: user.userId }
    });

    // Fetch access details for the user
    const access = await Access.findOne({
      where: { accessId: user.userId },
      include: [
        {
          model: CorporatePlan,
          attributes: [
            'planId',
            'planName',
            'durationValue',
            'durationUnit',
            'rate',
            'currency'
          ]
        }
      ]
    });

    // Fetch posted jobs
    const postedJobs = await Job.findAll({
      where: { userId: user.userId },
      attributes: [
        'jobId',
        'role',
        'createdAt',
        'jobType',
        'industry',
        'salaryRange',
        'requirements',
        'jobDescription',
        'addressCity',
        'addressState',
        'companyName',
        'website',
        'companySize',
        'contactPerson',
        'email'
      ]
    });

    // Calculate view and application counts from JobViewsApplications
    const jobViewCounts = await JobViewsApplications.findAll({
      where: { jobId: postedJobs.map(job => job.jobId), hasViewed: true },
      attributes: ['jobId', [sequelize.fn('COUNT', sequelize.col('id')), 'viewCount']],
      group: ['jobId']
    });

    const jobApplicationCounts = await JobViewsApplications.findAll({
      where: { jobId: postedJobs.map(job => job.jobId), hasApplied: true },
      attributes: ['jobId', [sequelize.fn('COUNT', sequelize.col('id')), 'applicationCount']],
      group: ['jobId']
    });

    // Map jobId to view and application counts
    const viewCountMap = jobViewCounts.reduce((acc, item) => {
      acc[item.jobId] = parseInt(item.get('viewCount'), 10);
      return acc;
    }, {});

    const applicationCountMap = jobApplicationCounts.reduce((acc, item) => {
      acc[item.jobId] = parseInt(item.get('applicationCount'), 10);
      return acc;
    }, {});

    // Calculate plan expiration date
    let expireAt = '';
    if (access && access.CorporatePlan) {
      const subscribedAt = new Date();
      const durationMs =
        access.CorporatePlan.durationUnit === 'days'
          ? access.CorporatePlan.durationValue * 24 * 60 * 60 * 1000
          : access.CorporatePlan.durationUnit === 'months'
          ? access.CorporatePlan.durationValue * 30 * 24 * 60 * 60 * 1000
          : 0;
      expireAt = new Date(subscribedAt.getTime() + durationMs).toISOString();
    }

    // Merge user, corporate details, and plan data into the profile
    const userProfile = {
      userId: user.userId,
      username: existingUser.username,
      firstName: existingUser.firstName,
      middleName: existingUser.middleName || '',
      lastName: existingUser.lastName,
      email: existingUser.email,
      role: existingUser.role,
      verified: corporateDetails?.verified || false,
      createdAt: existingUser.createdAt || new Date().toISOString(),
      updatedAt: existingUser.updatedAt || new Date().toISOString(),
      companyName: corporateDetails?.companyName || '',
      website: corporateDetails?.website || '',
      gstNumber: corporateDetails?.gstNumber || '',
      cinNumber: corporateDetails?.gstNumber || '',
      panNumber: corporateDetails?.panNumber || '',
      incorporationDate: corporateDetails?.incorporationDate
        ? corporateDetails.incorporationDate.toISOString()
        : '',
      businessType: corporateDetails?.businessType || '',
      registeredAddress: corporateDetails?.registeredAddress || '',
      businessEmail: corporateDetails?.businessEmail || '',
      businessPhone: corporateDetails?.businessPhone || '',
      postedJobs: postedJobs.map(job => ({
        jobId: job.jobId,
        role: job.role,
        createdAt: job.createdAt,
        jobType: job.jobType,
        industry: job.industry,
        salaryRange: job.salaryRange,
        requirements: job.requirements,
        jobDescription: job.jobDescription,
        addressCity: job.addressCity,
        addressState: job.addressState,
        companyName: job.companyName,
        website: job.website,
        companySize: job.companySize,
        contactPerson: job.contactPerson,
        email: job.email,
        views: viewCountMap[job.jobId] || 0,
        appliedVeterans: applicationCountMap[job.jobId] || 0
      })),
      planData: {
        planId: access?.CorporatePlan?.planId || '',
        planName: access?.CorporatePlan?.planName || 'Basic',
        resumeViewCount: access?.resumeCountLimit || 0,
        profileVideoViewCount: access?.profileVideoCountLimit || 0,
        jobPostedCount: access?.jobPostCountLimit || 0,
        subscribedAt: access ? new Date().toISOString() : '',
        expireAt: expireAt || '',
        rate: access?.CorporatePlan?.rate || 0,
        currency: access?.CorporatePlan?.currency || 'USD',
        profileVideoAccess: access?.profileVideo || false,
        resumeAccess: access?.resume || false,
        jobPostAccess: access?.jobPost || false
      }
    };

    return res.status(200).json({
      message: "Profile fetched successfully",
      profile: userProfile
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}


async function updateProfile(req, res) {
  try {
    const userId = req.user?.userId;
    const data = req.body;

    const existingUser = await User.findOne({ where: { userId } });
    const existingCorporateDetails = await CorporateDetails.findOne({ where: { userId } });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    await sequelize.transaction(async (t) => {
      // Update User table
      const userUpdateFields = {
        username: data.userName,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        updatedAt: new Date()
      };

      await User.update(userUpdateFields, {
        where: { userId },
        transaction: t
      });

      // Update or create CorporateDetails
      const corporateDetailsUpdateFields = {
        userId,
        companyName: data.companyName,
        website: data.website,
        gstNumber: data.gstNumber || null,
        cinNumber: data.cinNumber || null,
        panNumber: data.panNumber || null,
        incorporationDate: data.incorporationDate || null,
        businessType: data.businessType || null,
        registeredAddress: data.registeredAddress,
        businessEmail: data.businessEmail,
        businessPhone: data.businessPhone
      };

      if (existingCorporateDetails) {
        await CorporateDetails.update(corporateDetailsUpdateFields, {
          where: { userId },
          transaction: t
        });
      } else {
        await CorporateDetails.create(corporateDetailsUpdateFields, { transaction: t });
      }
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        userId,
        userName: data.userName,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        companyName: data.companyName,
        industry: data.industry,
        contact: data.contact,
        website: data.website,
        address: data.address,
        companySize: data.companySize,
        gstNumber: data.gstNumber,
        cinNumber: data.cinNumber,
        panNumber: data.panNumber,
        incorporationDate: data.incorporationDate,
        businessType: data.businessType,
        registeredAddress: data.registeredAddress,
        businessEmail: data.businessEmail,
        businessPhone: data.businessPhone,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error("Error updating profile: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getResume(req, res) {
  try {
    const user = req.user;
    const resumeId = req.query?.resumeId;
    const page = parseInt(req.query?.page) || 1;
    const limit = parseInt(req.query?.limit) || 10;
    const offset = (page - 1) * limit;

    if (!user || !user.userId) {
      return res.status(401).json({ message: "Unauthorized: No user found" });
    }

    const isAdmin = user?.role === "admin" && user?.manageUsers;

    // Common query options for fetching resume with related data
    const queryOptions = {
      include: [
        {
          model: ResumeEducation,
          as: 'education',
          attributes: ['degree', 'institution', 'years', 'percentage'],
        },
        {
          model: ResumeExperience,
          as: 'workExperience',
          attributes: ['role', 'company', 'duration', 'responsibilities'],
        },
        {
          model: ResumeProjects,
          as: 'projects',
          attributes: ['title', 'role', 'year', 'description'],
        },
      ],
      attributes: [
        'resumeId',
        'userId',
        'title',
        'contact',
        'profile',
        'skills',
        'languages',
        'createdAt',
        'updatedAt',
      ],
    };

    if (isAdmin) {
      // Admin: Fetch all resumes with pagination
      const { count, rows } = await Resume.findAndCountAll({
        ...queryOptions,
        offset,
        limit,
        order: [['createdAt', 'DESC']],
      });

      return res.status(200).json({
        total: count,
        page,
        pageSize: limit,
        resumes: rows,
      });
    }

    if (user.role === 'corporate') {
      if (resumeId) {
        // Corporate: Fetch a single resume by resumeId
        const resume = await Resume.findOne({
          where: { resumeId },
          ...queryOptions,
        });

        if (!resume) {
          return res.status(404).json({ message: "Resume Not Found" });
        }

        // Update resumeViewCount
        await User.update(
          {
            planData: {
              ...user.planData,
              resumeViewCount: (user.planData?.resumeViewCount || 0) + 1,
            },
            updatedAt: new Date(),
          },
          { where: { userId: user.userId } }
        );

        return res.status(200).json({ resume });
      }

      // Corporate: Fetch all resumes with pagination
      const { count, rows } = await Resume.findAndCountAll({
        ...queryOptions,
        offset,
        limit,
        order: [['createdAt', 'DESC']],
      });

      return res.status(200).json({
        total: count,
        page,
        pageSize: limit,
        resumes: rows,
      });
    }

    if (user.role === 'veteran') {
      // Veteran: Fetch only their own resumes
      const resumes = await Resume.findAll({
        where: { userId: user.userId },
        ...queryOptions,
        order: [['createdAt', 'DESC']],
      });

      if (!resumes || resumes.length === 0) {
        return res.status(404).json({ message: "No resumes found for this user." });
      }

      return res.status(200).json({
        message: "Veteran resumes fetched successfully",
        resumes,
      });
    }

    return res.status(403).json({ message: "Unauthorized access." });
  } catch (error) {
    console.error("Error fetching resume:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function matchUserProfile(req, res) {
  try {
    const corporateId = req.user?.userId;
    const { jobId, userId, resumeId } = req.query;

    if (!corporateId || !jobId || !userId || !resumeId) {
      return res.status(400).json({ message: "Corporate ID, Job ID, Resume ID, and User ID are required!" });
    }

    const [
      existingCorporate,
      existingUser,
      existingJob,
      existingResume
    ] = await Promise.all([
      User.findOne({ where: { userId: corporateId } }),
      User.findOne({ where: { userId } }),
      Job.findOne({ where: { jobId } }),
      Resume.findOne({ where: { resumeId } })
    ]);

    if (!existingCorporate || !existingUser || !existingJob || !existingResume) {
      return res.status(404).json({ message: "Corporate or User or Job or Resume not found!" });
    }

    let application = await Application.findOne({
      where: {
        userId,
        corporateId,
        jobId,
        resumeId
      }
    });

    if (application) {
      if (!application.corporateMatched) {
        const now = new Date(application.createdAt);
        const twentyEightDaysLater = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

        await Application.update(
          {
            corporateMatched: true,
            updatedAt: new Date(),
            status:102,
            
            expiredAt: twentyEightDaysLater
          },
          {
            where: {
              userId,
              corporateId,
              jobId,
              resumeId
            }
          }
        );
      }

      if (!application.corporateMatched && application.userMatched) {
        await sendMutualMatchEmail(application,existingJob,existingUser)
        return res.status(200).json({
          message: `User ${userId} and Corporate ${corporateId} are now matched for Job ${existingJob?.companyName}!`
        });
      }
    } else {
      const now = new Date();
      const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

      await Application.create({
        applicationId: uuidv4(),
        userId,
        corporateId,
        jobId,
        resumeId,
        userMatched: false,
        corporateMatched: true,
        profileVideoUrl: null,
        status: {
          code: 101,
          message: "Corporate Matched"
        },
        createdAt: now,
        updatedAt: now,
        expiredAt: fiveDaysLater
      });
    }

    return res.status(200).json({ message: "Corporate matched the user's profile for the job!" });

  } catch (error) {
    console.error("Error matching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getApplications(req, res) {
  try {
    const user = req.user;
    const { applicationId, jobId, matched } = req.query;

    const isVeteran = user.role === 'veteran';
    const isCorporate = user.role === 'corporate';

    if (!isVeteran && !isCorporate) {
      return res.status(403).json({ message: "Unauthorized role." });
    }

    // Build Sequelize filter
    const filter = {};

    if (applicationId) {
      filter.applicationId = applicationId;
    }

    if (jobId) {
      filter.jobId = jobId;
    }

    if (isVeteran) {
      filter.userId = user.userId;
    }

    if (isCorporate) {
      filter.corporateId = user.userId;
    }

    if (matched === 'true') {
      filter.corporateMatched = true;
      filter.userMatched = true;  // was `veteranMatched` in Mongo
    }

    const applications = await Application.findAll({ where: filter });

    if (!applications.length) {
      return res.status(200).json({ message: "No applications found.", applications: [] });
    }

    const resumeMap = new Map();
    const jobMap = new Map();

    if (isCorporate) {
      const resumeIds = [...new Set(applications.map(app => app.resumeId))];
      if (resumeIds.length) {
        const resumes = await Resume.findAll({
          where: { resumeId: { [Op.in]: resumeIds } },
          attributes: ['resumeId',  'title', 'contact','name', 'profile' ,'skills' , 'languages']
        });
        resumes.forEach(r => resumeMap.set(r.resumeId, r.toJSON()));
      }
    }

    if (isVeteran) {
      const jobIds = [...new Set(applications.map(app => app.jobId))];
      if (jobIds.length) {
        const jobs = await Job.findAll({
          where: { jobId: { [Op.in]: jobIds } },
          attributes: ['jobId', 'role', 'companyName', 'addressCity', 'postedMethod', ]
        });
        jobs.forEach(j => jobMap.set(j.jobId, j.toJSON()));
      }
    }

    const results = applications.map(app => {
      const result = {
        applicationId: app.applicationId,
        userId: app.userId,
        jobId: app.jobId,
        corporateId: app.corporateId,
        resumeId: app.resumeId,
        userMatched: app.userMatched,
        corporateMatched: app.corporateMatched,
        profileVideoUrl: app.profileVideoUrl,
        status: app.status,
        appliedAt: app.createdAt,
        expiredAt: app.expiredAt
      };

      if (isCorporate) {
        const resume = resumeMap.get(app.resumeId);
        result.resume = resume || null;
      }

      if (isVeteran) {
        const job = jobMap.get(app.jobId);
        result.job = job
          ? {
            jobId:job.jobId,
            title: job.role,
            company: job.companyName,
            location: job.addressCity
          }
          : null;
      }

      return result;
    });

    return res.status(200).json({
      message: "Applications retrieved successfully",
      applications: results
    });

  } catch (error) {
    console.error("Error fetching applications:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function requestProfileVideo(req, res) {
  try {
    const user = req.user;
    const applicationId = req.query?.applicationId;

    // Validate applicationId
    if (!applicationId) {
      return res.status(400).json({ message: 'Application ID is required' });
    }

    // Check if application exists
    const existingApplication = await Application.findOne({ where: { applicationId } });
    if (!existingApplication) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Update application status to numeric code 103 (Video Requested)
    await Application.update(
      {
        status: '103', // Use numeric code as a string to match STRING type
        updatedAt: new Date(),
      },
      { where: { applicationId } }
    );

    // Increment profileVideoCount in SubscribedPlan
    const subscribedPlan = await SubscribedPlan.findOne({ where: { userId: user.userId } });
    if (!subscribedPlan) {
      return res.status(404).json({ message: 'Subscribed plan not found for user' });
    }

    await SubscribedPlan.increment('profileVideoCount', {
      where: { userId: user.userId },
    });

    return res.status(200).json({ message: 'Video requested successfully' });
  } catch (error) {
    console.error('Error requesting video:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

// Haversine formula to calculate distance between two lat/lng
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function searchVeterans(req, res) {
  try {
    const { location, role, skillsMatch } = req.query;

    let skillsArray = [];
    if (skillsMatch) {
      try {
        skillsArray = JSON.parse(skillsMatch);
        if (!Array.isArray(skillsArray)) skillsArray = [];
      } catch (e) {
        return res.status(400).json({ error: 'Invalid skillsMatch format, should be an array.' });
      }
    }

    const resumes = await Resume.findAll();
    const results = [];

    let targetLat = null, targetLon = null;
    if (location) {
      const geo = await geocoder.geocode(location);
      if (!geo.length) return res.status(404).json({ error: 'Invalid location' });
      targetLat = geo[0].latitude;
      targetLon = geo[0].longitude;
    }

    for (const resume of resumes) {
      const userId = resume.userId;
      const title = resume.title?.toLowerCase() || '';
      const resumeSkills = resume.skills || [];

      const veteran = await VeteranDetails.findOne({ where: { userId } });
      if (!veteran) continue;

      // Check role match if role is passed
      if (role && !title.includes(role.toLowerCase())) continue;

      // Check skill match if skillsMatch is passed
      if (skillsArray.length > 0) {
        const lowerResumeSkills = resumeSkills.map(skill => skill.toLowerCase());
        const matchFound = skillsArray.some(skill =>
          lowerResumeSkills.includes(skill.toLowerCase())
        );
        if (!matchFound) continue;
      }

      let distance = null;
      if (location) {
        const resumeLocation = resume.contact?.location;
        if (!resumeLocation) continue;

        const geo = await geocoder.geocode(resumeLocation);
        if (!geo.length) continue;

        const lat = geo[0].latitude;
        const lon = geo[0].longitude;

        distance = calculateDistance(targetLat, targetLon, lat, lon);
      }

      results.push({
        userId,
        name: resume.name,
        title: resume.title,
        contact: resume.contact,
        profile: resume.profile,
        skills: resume.skills,
        languages: resume.languages,
        distance: distance !== null ? parseFloat(distance.toFixed(2)) : null
      });
    }

    // Sort by distance if available
    if (location) {
      results.sort((a, b) => a.distance - b.distance);
    }

    return res.json(results);
  } catch (err) {
    console.error('Error in searchVeterans:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function recordJobView(req, res) {
  // console.log("======================recordJobView called***+*********************==================================");
  try {
    const { jobId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const job = await Job.findOne({ where: { jobId } });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const [jobView, created] = await JobViewsApplications.findOrCreate({
      where: { userId: user.userId, jobId },
      defaults: {
        userId: user.userId,
        jobId,
        hasViewed: true,
        viewedAt: new Date()
      }
    });

    if (created || !jobView.hasViewed) {
      await sequelize.transaction(async (t) => {
        await jobView.update(
          { hasViewed: true, viewedAt: new Date() },
          { transaction: t }
        );
        await Job.increment('views', {
          by: 1,
          where: { jobId },
          transaction: t
        });
      });
    }

    return res.status(200).json({ message: 'View recorded successfully' });
  } catch (error) {
    console.error('Error recording job view:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

async function recordJobApplication(req, res) {
  console.log("======================recordJobView called***+*********************==================================");
  try {
    const { jobId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // if (user.role !== 'veteran') {
    //   return res.status(403).json({ message: 'Only veterans can apply for jobs' });
    // }

    const job = await Job.findOne({ where: { jobId } });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // const corporateId = job.User?.CorporateDetail?.corporateId;
    // if (!corporateId) {
    //   return res.status(400).json({ message: 'Corporate details not found for this job' });
    // }

    const [jobView, created] = await JobViewsApplications.findOrCreate({
      where: { userId: user.userId, jobId },
      defaults: {
        userId: user.userId,
        jobId,
        hasApplied: true,
        appliedAt: new Date()
      }
    });

    if (created || !jobView.hasApplied) {
      await sequelize.transaction(async (t) => {
        await jobView.update(
          { hasApplied: true, appliedAt: new Date() },
          { transaction: t }
        );
        await Job.increment('application_count', {
          by: 1,
          where: { jobId },
          transaction: t
        });
        // await Application.create(
        //   {
        //     userId: user.userId,
        //     jobId,
        //     corporateId,
        //     resumeId: null // Adjust if resume selection is required
        //   },
        //   { transaction: t }
        // );
      });
    }

    return res.status(200).json({ message: 'Application recorded successfully' });
  } catch (error) {
    console.error('Error recording job application:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

async function generateResumeEndpoint(req, res) {
  try {
    const { userId } = req.body;
    console.log('Received request to generate resume:', { userId, authUser: req.user });

    if (!userId) {
      console.error('Missing userId in request body');
      return res.status(400).json({ message: 'userId is required in request body' });
    }

    if (!req.user) {
      console.error('No user found in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Log user details for debugging
    // console.log('Authenticated user:', { userId: req.user.userId, role: req.user.role, planId:STRUCTOR}) 
    // Check subscription status for corporate users
    // const subscription = await SubscribedPlan.findOne({
    //   where: { userId: req.user.userId, planId: req.user.planId },
    //   include: [{ model: CorporatePlan, attributes: ['planId', 'name', 'permissions'] }]
    // });

    // Check permissions (admin or resume permission)
    // const isOwnResume = req.user.userId === userId;
    // const hasResumePermission = req.user.role === 'admin' || 
    //   subscription?.CorporatePlan?.permissions?.includes('resume') || 
    //   req.user.permissions?.includes('resume');
    
    // if (!isOwnResume && !hasResumePermission) {
    //   console.error('Authorization failed:', { requestedUserId: userId, authUserId: req.user.userId });
    //   return res.status(403).json({ message: 'Unauthorized to generate resume for this user' });
    // }

    // Fetch user and resume data
    const userData = await User.findOne({ where: { userId } });
    if (!userData) {
      console.error('User not found:', { userId });
      return res.status(404).json({ message: 'User not found' });
    }

    const resume = await Resume.findOne({ 
      where: { userId },
      include: [
        { model: ResumeEducation, as: 'education' },
        { model: ResumeExperience, as: 'workExperience' },
        { model: ResumeProjects, as: 'projects' }
      ]
    });

    if (!resume) {
      console.error('Resume not found:', { userId });
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Prepare JSON data for PDF generation
    const resumeData = {
      userId,
      name: resume.name || `${userData.firstName} ${userData.lastName || ''}`.trim(),
      title: resume.title || '',
      contact: resume.contact || {},
      profile: resume.profile || '',
      skills: resume.skills || [],
      education: (resume.education || []).map(edu => ({
        years: edu.years || '',
        institution: edu.institution || '',
        degree: edu.degree || '',
        percentage: edu.percentage || ''
      })),
      work_experience: (resume.workExperience || []).map(exp => ({
        company: exp.company || '',
        role: exp.role || '',
        duration: exp.duration || '',
        responsibilities: exp.responsibilities || []
      })),
      projects: (resume.projects || []).map(proj => ({
        title: proj.title || '',
        role: proj.role || '',
        year: proj.year || '',
        description: proj.description || ''
      }))
    };

    console.log('Generating resume for:', { userId, name: resumeData.name });

    // Generate and send PDF
    await generateResume(resumeData, res);
  } catch (error) {
    console.error('Error generating resume:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}


module.exports = {
  subscription,
  postOrUpdateJob,
  deletePostedJob,
  getJobs,
  updateProfile,
  getResume,
  getProfile,
  matchUserProfile,
  getApplications,
  requestProfileVideo,
  searchVeterans,
  recordJobView,
  recordJobApplication,
  generateResumeEndpoint
}
