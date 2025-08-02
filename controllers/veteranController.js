const { v4: uuidv4 } = require("uuid")
// const dbModel = require("../models/dbModels")
const { sequelize } = require('../utils/db');
const { uploadVideoToS3, deleteVideoFromS3 } = require('../utils/s3Multer')

const {
     Job, 
     User, 
     SavedJob,
     Resume ,
     Application,
     ResumeEducation,
     ResumeExperience,
      ResumeProjects,
    } = require("../models");

async function saveOrRemoveJob(req, res) {
  try {
    const jobId = req.query?.jobId;
    const userId = req.user?.userId;

    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required!" });
    }

    // Ensure job exists
    const job = await Job.findOne({ where: { jobId } });
    if (!job) {
      return res.status(404).json({ message: "Job doesn't exist!" });
    }

    // Ensure user exists
    const user = await User.findOne({ where: { userId } });
    if (!user) {
      return res.status(404).json({ message: "User doesn't exist!" });
    }

    // Check if already saved
    const savedEntry = await SavedJob.findOne({ where: { userId, jobId } });

    if (savedEntry) {
      await SavedJob.destroy({ where: { userId, jobId } });
      return res.status(200).json({ message: "Job removed from saved list." });
    }

    // Check if limit reached
    const savedJobsCount = await SavedJob.count({ where: { userId } });
    if (savedJobsCount >= 20) {
      return res.status(400).json({ message: "You can save a maximum of 20 jobs." });
    }

    // Save new job
    await SavedJob.create({ userId, jobId, createdAt: new Date() });
    return res.status(201).json({ message: "Job saved successfully!" });

  } catch (error) {
    console.error("Error save/remove job: ", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function createOrUpdateResume(req, res) {
  try {
    const userId = req.user?.userId;
    const data = req.body;
    const resumeId = req.query?.resumeId;

    // Validate user and fetch name fields
    const user = await User.findByPk(userId, {
      attributes: ['userId', 'username']
    });
    if (!user) {
      return res.status(404).json({ message: "User does not exist!" });
    }

  

    

    // Start a transaction
    const result = await sequelize.transaction(async (t) => {
      let resume;

      if (resumeId) {
        // Update existing resume
        resume = await Resume.findOne({ where: { resumeId, userId }, transaction: t });
        if (!resume) {
          throw new Error("Resume not found!");
        }

        // Update Resume table
        await resume.update(
          {
            title: data.title,
            contact:data.contact,
            profile: data.profile,
            skills: data.skills,
            languages: data.languages,
            updatedAt: new Date(),
            name:user.username
          },
          { transaction: t }
        );

        // Delete existing related records
        await ResumeEducation.destroy({ where: { resumeId }, transaction: t });
        await ResumeExperience.destroy({ where: { resumeId }, transaction: t });
        await ResumeProjects.destroy({ where: { resumeId }, transaction: t });
      } else {
        // Create new resume
        resume = await Resume.create(
          {
            resumeId: uuidv4(),
            userId,
            title: data.title,
            contact: data.contact,
            profile: data.profile,
            skills: data.skills,
            languages: data.languages,
            name:user.username
          },
          { transaction: t }
        );
      }

      // Create education records
      if (data.education && data.education.length > 0) {
        const educationRecords = data.education.map((edu) => ({
          id: uuidv4(),
          resumeId: resume.resumeId,
          years: edu.years,
          institution: edu.institution,
          degree: edu.degree,
          percentage: edu.percentage,
        }));
        await ResumeEducation.bulkCreate(educationRecords, { transaction: t });
      }

      // Create work experience records
      if (data.workExperience && data.workExperience.length > 0) {
        const experienceRecords = data.workExperience.map((exp) => ({
          id: uuidv4(),
          resumeId: resume.resumeId,
          company: exp.company,
          role: exp.role,
          duration: exp.duration,
          responsibilities: exp.responsibilities,
        }));
        await ResumeExperience.bulkCreate(experienceRecords, { transaction: t });
      }

      // Create project records
      if (data.projects && data.projects.length > 0) {
        const projectRecords = data.projects.map((proj) => ({
          id: uuidv4(),
          resumeId: resume.resumeId,
          title: proj.title,
          role: proj.role,
          year: proj.year,
          description: proj.description,
        }));
        await ResumeProjects.bulkCreate(projectRecords, { transaction: t });
      }

      return resume;
    });

    // Return success response
    if (resumeId) {
      return res.status(200).json({ message: "Resume updated successfully" });
    } else {
      return res.status(201).json({ message: "Resume created successfully", resumeId: result.resumeId });
    }
  } catch (error) {
    console.error("Error create/update resume:", error);
    if (error.message === "Resume not found!") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
async function deleteResume(req, res) {
  try {
    const userId = req.user?.userId;
    const resumeId = req.query?.resumeId;

    if (!resumeId) {
      return res.status(400).json({ message: "Resume ID is required" });
    }
    
    const resume = await Resume.findOne({ where: { resumeId, userId } });

    if (!resume) {
      return res.status(404).json({ message: "Resume not found or not owned by user" });
    }

    await resume.destroy();

    return res.status(200).json({ message: "Resume removed successfully!" });
  } catch (error) {
    console.error("Error removing resume:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getSavedJobs(req, res) {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get total saved jobs for user
    const totalJobs = await SavedJob.count({ where: { userId } });

    if (totalJobs === 0) {
      return res.status(404).json({ message: "No saved jobs found" });
    }

    // Fetch saved job details with pagination
    const savedJobs = await SavedJob.findAll({
      where: { userId },
      include: [
        {
          model: Job,
          attributes: { exclude: ['updatedAt'] }
        }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });

    const jobs = savedJobs
      .map(entry => entry.Job)
      .filter(job => job !== null); // Exclude any nulls (e.g., job deleted from DB)

    return res.status(200).json({
      total: totalJobs,
      page,
      pageSize: limit,
      jobs
    });

  } catch (error) {
    console.error("Error fetching saved jobs: ", error);
    res.status(500).json({ message: "Internal Server  " });
  }
}

async function matchCorporateJob(req, res) {
  try {
    const userId = req.user?.userId;
    const { jobId, corporateId, resumeId } = req.query;

    if (!userId || !jobId || !resumeId || !corporateId) {
      return res.status(400).json({ message: "User ID, Job ID, Resume ID, and Corporate ID are required!" });
    }

    // Fetch all required data
    const [existingUser, existingJob, existingResume, existingCorporate] = await Promise.all([
      User.findByPk(userId),
      Job.findByPk(jobId),
      Resume.findByPk(resumeId),
      User.findByPk(corporateId),
    ]);

    if (!existingUser || !existingJob || !existingResume || !existingCorporate) {
      return res.status(404).json({ message: "User, Job, Resume, or Corporate not found!" });
    }

    const profileVideoUrl = null;

    let existingApplication = await Application.findOne({
      where: { userId, jobId, corporateId, resumeId },
    });

    if (existingApplication) {
      if (!existingApplication.userMatched) {
        const now = new Date(existingApplication.createdAt);
        const expiredAt = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
        await existingApplication.update({
          userMatched: true,
          updatedAt: new Date(),
          expiredAt,
          status: 102, // Use status field with numeric code for Mutually Matched
        });
      }
      
      if (!existingApplication.userMatched && existingApplication.corporateMatched) {
        await sendMutualMatchEmail(existingApplication, existingJob, existingUser);
        return res.status(200).json({
          message: `You are now matched with ${existingCorporate.userName} for the job ${existingJob.title}!`,
        });
      }
    } else {
      const now = new Date();
      const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

      await Application.create({
        applicationId: uuidv4(),
        userId,
        jobId,
        corporateId,
        resumeId,
        userMatched: true,
        corporateMatched: false,
        profileVideoUrl,
        status: 100, // Use status field with numeric code for User Matched
        createdAt: now,
        updatedAt: now,
        expiredAt: fiveDaysLater,
      });

      // Increment the data_applied count for the job
      await existingJob.increment('data_applied');
    }

    return res.status(200).json({ message: "You've successfully matched yourself to the job!" });
  } catch (error) {
    console.error("Error matching to job: ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getProfile(req, res) {
  try {
    const { userId } = req.user;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No user found" });
    }

    const user = await User.findOne({
      where: { userId },
      attributes: { exclude: ['passwordHash', 'createdAt', 'updatedAt'] },
      include: [
        {
          model: Resume,
          as: 'Resumes', // Match frontend's expected key
          attributes: [
            'resumeId',
            'title',
            'contact',
            'profile',
            'skills',
            'languages',
            'createdAt',
            'updatedAt',
          ],
          include: [
            { model: ResumeEducation, as: 'education' },
            { model: ResumeExperience, as: 'workExperience' },
            { model: ResumeProjects, as: 'projects' },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile fetched successfully",
      profile: user,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function acceptRequestAndUploadVideo(req, res) {
  try {
    const user = req.user;
    const applicationId = req.query?.applicationId;

    if (!applicationId) {
      return res.status(400).json({ message: "Application ID is required!" });
    }

    const existingApplication = await Application.findOne({ where: { applicationId } });

    if (!existingApplication) {
      return res.status(404).json({ message: "Application not found!" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded!" });
    }

    // Delete old video from S3 if exists
    if (existingApplication.profileVideoUrl) {
      const oldVideoKey = existingApplication.profileVideoUrl.split(".com/")[1];
      await deleteVideoFromS3(oldVideoKey);
    }


    const videoUrl = await uploadVideoToS3(req.file);

    
    await existingApplication.update({
      profileVideoUrl: videoUrl,
      status: 105,
    });

    return res.status(200).json({
      message: "Profile video uploaded and Request Accepted successfully!"
    });

  } catch (error) {
    console.error("Upload or accept error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function rejectRequest(req, res) {
  try {
    const user = req.user;
    const applicationId = req.query?.applicationId;

    if (!applicationId) {
      return res.status(400).json({ message: "Application ID is required!" });
    }

    const existingApplication = await Application.findOne({ where: { applicationId } });

    if (!existingApplication) {
      return res.status(404).json({ message: "Application not found!" });
    }

    await existingApplication.update({
      status: 104,
    });

    return res.status(200).json({ message: "Request rejected successfully!" });
  } catch (error) {
    console.error("Request reject error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = { 
    saveOrRemoveJob,
    getProfile,
    createOrUpdateResume,
    deleteResume,
    getSavedJobs,
    matchCorporateJob,
    acceptRequestAndUploadVideo,
    rejectRequest,
    incrementJobView
}
