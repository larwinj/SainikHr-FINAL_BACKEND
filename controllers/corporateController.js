const { v4: uuidv4 } = require("uuid")
const dbModel = require("../models/dbModels")

async function profileUpdate(req,res) {
    try {
        const userId = req.user?.userId
        const data = req.body
        const usersCollection = await dbModel.getUsersCollection()
        const existingUser = await usersCollection.findOne({ userId })

        if (!existingUser) {
            return res.status(404).json({ message: "User not Found!" })
        }

        const updatedData = { ...existingUser, ...data }
        updatedData.updatedAt = new Date()

        if(updatedData.subscriptionPlan === "Basic") {
            updatedData.trailViewCount = 5
            updatedData.isTrailUsedUp = false
        }

        await usersCollection.replaceOne(
            { userId }, 
            updatedData
        )

        return res.status(200).json({ message: "Profile updated successfully"})
    } catch (error) {
        console.error("Error : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function addJobCard(req,res) {
    try {
        const userId = req.user?.userId
        const data = req.body
        const jobsCollection = await dbModel.getJobsCollection()
        const usersCollection = await dbModel.getUsersCollection()

        const existingUser = await usersCollection.findOne({ userId })

        if (!existingUser) {
            return res.status(404).json({ message: "User not Found!" })
        }

        data.jobId = uuidv4()
        data.createdAt = new Date()
        data.updatedAt = new Date()
        await jobsCollection.insertOne(data)

        await usersCollection.updateOne(
            { userId }, 
            { $push : { jobs: data.jobId }}
        )

        return res.status(201).json({ message: "Job Card Added Successfully" })
    } catch (error) {
        console.error("Error : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function viewJobCard(req,res) {
    try {
        const userId = req.user?.userId
        const data = req.body

        const jobsCollection = await dbModel.getJobsCollection()
        const usersCollection = await dbModel.getUsersCollection()

        const existingUser = await usersCollection.findOne({ userId })

        if (!existingUser) {
            return res.status(404).json({ message: "User not Found!" })
        }

        data.jobId = uuidv4()
        data.createdAt = new Date()
        data.updatedAt = new Date()
        await jobsCollection.insertOne(data)

        await usersCollection.updateOne(
            { userId }, 
            { $push : { jobs: data.jobId }}
        )

        return res.status(201).json({ message: "Job Card Added Successfully" })
    } catch (error) {
        console.error("Error : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function updateJobCard(req, res) {
    try {
      const jobId = req.params?.id;
      const updatedData = req.body; 
  
      if (!jobId || jobId === "") {
        return res.status(400).json({ message: "JobId is required" });
      }
  
      const jobsCollection = await dbModel.getJobsCollection();
      const existingJob = await jobsCollection.findOne({ jobId });
  
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found" });
      }

      delete updatedData.jobId;
  
      await jobsCollection.updateOne(
        { jobId },
        {
          $set: {
            ...updatedData,
            updatedAt: new Date(), 
          },
        }
      );
  
      return res.status(200).json({ message: "Job Card Updated Successfully" });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
}

async function subscription(req, res) {
  try {
      const userId = req.user?.userId;
      const { newPlan } = req.query; 

      if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
      }

      if (!newPlan || !["standard", "enterprise"].includes(newPlan)) {
          return res.status(400).json({ message: "Invalid subscription plan" });
      }

      const usersCollection = await dbModel.getUsersCollection();
      const user = await usersCollection.findOne({ userId });

      if (!user || !user.role.startsWith("corporate")) {
          return res.status(403).json({ message: "Access Denied: Only corporate users can upgrade" });
      }

      const newRole = `corporate_${newPlan}`;

      await usersCollection.updateOne(
          { userId },
          {
            $set: { 
            role: newRole, 
            subscribedAt: new Date(),
            ...(user.role === "corporate_free" && { resumeViews: 0 }) 
          }
        }  
      );

      return res.status(200).json({ message: `Subscription upgraded to ${newPlan}` });

  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getJobCards(req, res) {
    try {
        const userId = req.user?.userId;
        const { page = 1, limit = 10, corporateMatchedOnly } = req.query;

        const jobsCollection = await dbModel.getJobsCollection();
        const usersCollection = await dbModel.getUsersCollection();
        const applicationsCollection = await dbModel.getApplicationsCollection();

        if (!userId) {
            return res.status(400).json({ message: "User ID is required!" });
        }

        const user = await usersCollection.findOne({ userId });

        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        const jobIds = user.jobs || [];
        if (jobIds.length === 0) {
            return res.status(200).json({ message: "No jobs found.", jobs: [] });
        }

        let filteredJobIds = jobIds;

        if (corporateMatchedOnly === "true") {
            const matchedApplications = await applicationsCollection
                .find({ userId, corporateMatched: true, jobId: { $in: jobIds } })
                .toArray();

            filteredJobIds = matchedApplications.map(app => app.jobId);

            if (filteredJobIds.length === 0) {
                return res.status(200).json({ message: "No matched jobs found.", jobs: [] });
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const jobCards = await jobsCollection
            .find({ jobId: { $in: filteredJobIds } })
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();

        const totalJobs = filteredJobIds.length;

        return res.status(200).json({
            message: "Job Cards Retrieved Successfully",
            jobs: jobCards,
            totalJobs,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalJobs / parseInt(limit)),
        });

    } catch (error) {
        console.error("Error fetching job cards: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function matchUserProfileReject(req, res) {
    try {
        const corporateId = req.user?.userId; 
        const { jobId, userId } = req.body;   

        if (!corporateId || !jobId || !userId) {
            return res.status(400).json({ message: "Corporate ID, Job ID, and User ID are required!" });
        }

        const usersCollection = await dbModel.getUsersCollection();
        const applicationsCollection = await dbModel.getApplicationsCollection();

        const corporateUser = await usersCollection.findOne({ userId: corporateId });
        if (!corporateUser) {
            return res.status(404).json({ message: "Corporate user not found!" });
        }

        const existingUser = await usersCollection.findOne({ userId });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        let existingApplication = await applicationsCollection.findOne({ userId, corporateId, jobId });

        if (existingApplication) {
            if (!existingApplication.corporateMatched) {
                await applicationsCollection.updateOne(
                    { userId, corporateId, jobId },
                    { $set: { corporateMatched: false, updatedAt: new Date() } }
                );
            }
        }

        return res.status(200).json({ message: "Corporate matched the user's profile for the job is successfully rejected!" });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function matchUserProfile(req, res) {
    try {
        const corporateId = req.user?.userId; 
        const { jobId, userId } = req.body;   

        if (!corporateId || !jobId || !userId) {
            return res.status(400).json({ message: "Corporate ID, Job ID, and User ID are required!" });
        }

        const usersCollection = await dbModel.getUsersCollection();
        const applicationsCollection = await dbModel.getApplicationsCollection();

        const corporateUser = await usersCollection.findOne({ userId: corporateId });
        if (!corporateUser) {
            return res.status(404).json({ message: "Corporate user not found!" });
        }

        const existingUser = await usersCollection.findOne({ userId });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        let existingApplication = await applicationsCollection.findOne({ userId, corporateId, jobId });

        if (existingApplication) {
            if (!existingApplication.corporateMatched) {
                await applicationsCollection.updateOne(
                    { userId, corporateId, jobId },
                    { $set: { userMatched: true, updatedAt: new Date() } }
                );
            }

            if (!existingApplication.userMatched && existingApplication.corporateMatched) {
                return res.status(200).json({ message: `User ${userId} and Corporate ${corporateId} are now matched for Job ${jobId}!` });
            }
        } else {
            const newApplication = {
                applicationId: uuidv4(),
                userId,
                corporateId,
                jobId,
                userMatched: true,
                corporateMatched: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await applicationsCollection.insertOne(newApplication);
        }

        return res.status(200).json({ message: "Corporate matched the user's profile for the job!" });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function getMatchedUsers(req, res) {
    try {
        const corporateId = req.user?.userId;
        const { jobId } = req.params;

        if (!corporateId || !jobId) {
            return res.status(400).json({ message: "Corporate ID and Job ID are required!" });
        }

        const usersCollection = await dbModel.getUsersCollection();
        const applicationsCollection = await dbModel.getApplicationsCollection();
        const resumesCollection = await dbModel.getResumesCollection();


        const matchedApplications = await applicationsCollection
            .find({ jobId, corporateId, corporateMatched: true })
            .toArray();

        if (matchedApplications.length === 0) {
            return res.status(200).json({ message: "No matched users found for this job.", users: [] });
        }

        const userIds = matchedApplications.map(app => app.userId);

        const matchedUsers = await usersCollection
            .find({ userId: { $in: userIds } })
            .toArray();

        const usersWithProfiles = await Promise.all(matchedUsers.map(async (user) => {
            const { userId, profile_video_url, resumes } = user;

            let latestResume = null;
            let formattedResumes = [];

            if (resumes && resumes.length > 0) {
                const resumeIds = resumes.map(resume => resume.resumeId);
                const resumesData = await resumesCollection
                    .find({ resumeId: { $in: resumeIds } })
                    .toArray();

                const resumeTitleMap = new Map();
                resumesData.forEach(resume => {
                    resumeTitleMap.set(resume.resumeId, resume.title);
                });

                const sortedResumes = resumes.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
                const latestResumeId = sortedResumes[0].resumeId;

                const latestResumeData = await resumesCollection.findOne({ resumeId: latestResumeId });

                if (latestResumeData) {
                    const { fileUrl, resumeId, createdAt, updatedAt, _id, ...filteredResume } = latestResumeData;
                    latestResume = filteredResume;
                }

                formattedResumes = resumes.map(resume => ({
                    title: resumeTitleMap.get(resume.resumeId) || "Unknown",
                    fileUrl: resume.fileUrl
                }));
            }

            return {
                userId,
                profile_video_url,
                resumes: formattedResumes,
                latestResume
            };
        }));

        return res.status(200).json({
            message: "Matched users retrieved successfully",
            users: usersWithProfiles
        });


    } catch (error) {
        console.error("Error fetching matched users: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = { 
    profileUpdate,
    addJobCard,
    getJobCards,
    updateJobCard,
    subscription,
    viewJobCard,
    matchUserProfile,
    matchUserProfileReject,
    getMatchedUsers
}
