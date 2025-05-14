const { v4: uuidv4 } = require("uuid")
const JWTToken = require("../utils/jwtToken")
const dbModel = require("../models/dbModels")

async function subscription(req, res) {
    try {
        const userId = req.user?.userId
        const planId = req.query?.planId

        const usersCollection = await dbModel.getUsersCollection()
        const corporatePlansCollection = await dbModel.getCorporatePlansCollection()
        const existingUser = await usersCollection.findOne({ userId })
        const plan = await corporatePlansCollection.findOne({ planId })

        if(!plan || !existingUser || existingUser.role !== 'corporate') {
            return res.status(403).json({ message: "Plan or Corporate User doesn't exists"})
        }

        let expireAt = null
        let planName = null
        const subscribedAt = new Date()

        if (plan?.duration?.value && plan?.duration?.unit) {
            planName = plan.planName
            const durationValue = Number(plan.duration.value)
            const durationUnit = plan.duration.unit
            expireAt = new Date(subscribedAt)
            switch (durationUnit.toLowerCase()) {
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
        await usersCollection.updateOne(
            { userId },
            {
                $set: {
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
                }
            }
        )
        const token = JWTToken({
            userId,
            role: existingUser.role,
            planId,
            expireAt
        },"1d")
        
        return res.status(200).json({ message: `Subscription upgraded to ${planName}`, token})
        
    } catch (error) {
        console.error("Error in Subscription:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function postOrUpdateJob(req,res) {
    try {
        const userId = req.user?.userId
        const userRole = req.user?.role
        const data = req.body
        const jobId = req.query?.jobId

        const jobsCollection = await dbModel.getJobsCollection()
        const usersCollection = await dbModel.getUsersCollection()

        const existingUser = await usersCollection.findOne({ userId })

        if (!existingUser) {
            return res.status(404).json({ message: "User not found!" })
        }

        if (jobId) {
            const existingJob = await jobsCollection.findOne({ jobId })

            if (!existingJob) {
                return res.status(404).json({ message: "Job not found!" })
            }

            const updatedJob = {
                jobId: existingJob.jobId,
                ...data,
                postedMethod: existingJob.postedMethod,
                data: existingJob.data,
                createdAt: existingJob.createdAt,
                updatedAt: new Date()
            }

            await jobsCollection.replaceOne({ jobId }, updatedJob)
            return res.status(200).json({ message: "Job updated successfully" })
        } else {
            const newJobId = uuidv4()
            const jobFormatted = {
                jobId: newJobId,
                ...data,
                postedMethod: userRole === "corporate" ? "Private" : "Public",
                data: {
                    totalViews: 0,
                    appliedVeterans: 0,
                    postedBy: userId
                },
                createdAt: new Date(),
                updatedAt: new Date()
            }
            
            await jobsCollection.insertOne(jobFormatted)
            
            if (userRole === "corporate") {
                await usersCollection.updateOne(
                    { userId },
                    {
                        $push: { postedJobs: newJobId },
                        $set: { updatedAt: new Date() },
                        $inc: { 'planData.jobPostedCount': 1 }
                    }
                )
            }
            return res.status(201).json({ message: "Job posted successfully" })
        }
    } catch (error) {
        console.error("Error posting job: ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function deletePostedJob(req, res) {
    try {
        const jobId = req.query?.jobId
        const userId = req.user?.userId

        if (!jobId) {
            return res.status(400).json({ message: "Job ID is required" })
        }

        const jobsCollection = await dbModel.getJobsCollection()
        const usersCollection = await dbModel.getUsersCollection()
        const existingJob = await jobsCollection.findOne({ jobId })

        if (!existingJob) {
            return res.status(404).json({ message: "The job doesn't exist" })
        }

        if (req.user?.role === 'admin' && req.user?.manageJobs) {
            await jobsCollection.replaceOne({ jobId }, { jobId, message: "Deleted By Admin" })
            return res.status(200).json({ message: "The Posted Job is deleted Successfully" })
        }

        if (existingJob?.data?.postedBy !== userId) {
            return res.status(403).json({ message: "You don't have permission to delete this job post" })
        }

        await jobsCollection.deleteOne({ jobId })
        await usersCollection.updateOne(
            { userId },
            {
                $pull: { postedJobs: jobId },
                $set: { updatedAt: new Date() }
            }
        )

        return res.status(200).json({ message: "The Posted Job is deleted Successfully" })

    } catch (error) {
        console.error("Error deleting job: ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function getJobs(req, res) {
    try {
        const jobId = req.query?.jobId
        const page = parseInt(req.query?.page) || 1
        const limit = parseInt(req.query?.limit) || 10
        const skip = (page - 1) * limit

        const isAdmin = user?.role === "admin" && user?.manageJobs

        const jobsCollection = await dbModel.getJobsCollection()
        const projection = isAdmin ? {} : { updatedAt: 0, 'data.postedBy': 0, _id: 0 }

        if (jobId) {
            const job = await jobsCollection.findOne({ jobId }, { projection })

            if (!job) {
                return res.status(404).json({ message: "Job not found" })
            }
            
            await jobsCollection.updateOne(
                { jobId },
                { $inc: { "data.totalViews": 1 } }
            )

            return res.status(200).json({ job })
        }

        const totalJobs = await jobsCollection.countDocuments({})
        const jobs = await jobsCollection
            .find({}, { projection })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .toArray()

        return res.status(200).json({
            total: totalJobs,
            page,
            pageSize: limit,
            jobs,
        })

    } catch (error) {
        console.error("Error fetching jobs:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

//under this updation required
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
            if (!existingApplication.userMatched) {
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
            if (!existingApplication.userMatched) {
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
    subscription,
    postOrUpdateJob,
    deletePostedJob,
    getJobs,
    profileUpdate,
    getJobCards,
    viewJobCard,
    matchUserProfile,
    matchUserProfileReject,
    getMatchedUsers
}
