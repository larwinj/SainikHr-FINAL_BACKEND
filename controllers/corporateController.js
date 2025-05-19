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
                companyName: existingJob.companyName,
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
                companyName: existingUser.companyName,
                ...data,
                postedMethod: userRole === "corporate" ? "Private" : "Public",
                data: {
                    totalViews: 0,
                    appliedVeterans: 0,
                    postedBy: {
                        userId,
                        verified: existingUser.verified
                    }
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
        const user = req.user
        const jobIds = req.query?.jobId?.split(',').filter(Boolean) || []
        const page = parseInt(req.query?.page) || 1
        const limit = parseInt(req.query?.limit) || 10
        const skip = (page - 1) * limit

        const isAdmin = user?.role === "admin" && user?.manageJobs

        const jobsCollection = await dbModel.getJobsCollection()
        const projection = isAdmin ? { _id: 0 } : { updatedAt: 0, _id: 0 }

        if (jobIds.length === 1) {
            const jobId = jobIds[0]
            const job = await jobsCollection.findOne({ jobId }, { projection })

            if (!job) {
                return res.status(404).json({ message: "Job not found" })
            }

            await jobsCollection.updateOne(
                { jobId },
                { $inc: { "data.totalViews": 1 } }
            );

            return res.status(200).json({ job })
        }

        const query = jobIds.length > 1 ? { jobId: { $in: jobIds } } : {}

        const totalJobs = await jobsCollection.countDocuments(query)
        const jobs = await jobsCollection
            .find(query, { projection })
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
        console.error("Error fetching jobs:", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function getProfile(req, res) {
    try {
        const user = req.user;

        const usersCollection = await dbModel.getUsersCollection();
        const jobsCollection = await dbModel.getJobsCollection();

        let existingUser = await usersCollection.findOne(
            { userId: user.userId },
            { projection: { _id: 0, userId: 0, password: 0 } }
        );

        if (!existingUser) {
            return res.status(404).json({ message: "User not Found!" });
        }

        const postedJobs = existingUser?.postedJobs || [];

        if (postedJobs.length > 0) {
            const jobs = await jobsCollection
                .find(
                    { jobId: { $in: postedJobs } },
                    { projection: { _id: 0, postedMethod: 0, 'data.postedBy': 0 } }
                )
                .toArray();
            existingUser.postedJobs = jobs;
        }

        return res.status(200).json({
            message: "Profile fetched successfully",
            profile: existingUser
        });

    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function updateProfile(req,res) {
    try {
        const userId = req.user?.userId
        const data = req.body
        const usersCollection = await dbModel.getUsersCollection()
        const existingUser = await usersCollection.findOne({ userId })
        
        if (!existingUser) {
            return res.status(404).json({ message: "User not Found!" })
        }

        let updateQuery = {
            userName: data.userName,
            'name.firstName': data.firstName,
            'name.middleName': data.middleName,
            'name.lastName': data.lastName,
        }

        if(req.user.role === 'corporate') {
            updateQuery.companyName = data.companyName
        }

        await usersCollection.updateOne(
            { userId }, 
            { 
                $set: {
                    ...updateQuery
                }
            }
        )
        
        return res.status(200).json({ message: "Profile updated successfully"})
    } catch (error) {
        console.error("Error updating profile : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function getResume(req, res) {
    try {
        const user = req.user
        const resumeId = req.query?.resumeId
        const page = parseInt(req.query?.page) || 1
        const limit = parseInt(req.query?.limit) || 10
        const skip = (page - 1) * limit

        const isAdmin = user?.role === "admin" && user?.manageUsers

        const resumesCollection = await dbModel.getResumesCollection()
        const usersCollection = await dbModel.getUsersCollection()
        let projection = {}

        if (isAdmin) {
            
            projection = { _id: 0 }

        } else if(user.role === 'corporate') {
            
            projection = { resumeId: 1, userId: 1, name: 1, title: 1, 'contact.location': 1, profile: 1 }
            
            if(resumeId) {
                const existingResume = await resumesCollection.findOne({ resumeId })

                if(!existingResume) {
                    return res.status(404).json({ message: "Resume Not Found" })
                }
                await usersCollection.updateOne(
                    { userId: user.userId },
                    {
                        $inc: { 'planData.resumeViewCount': 1 },
                        $set: { updatedAt: new Date() }
                    }
                )
                return res.status(200).json({ resume: existingResume })
            }
        } else if (user.role === 'veteran') {
            const existingUser = await usersCollection.findOne({ userId: user.userId })

            const resumeIds = existingUser?.resumes || [];

            const resumes = await resumesCollection
                .find({ resumeId: { $in: resumeIds } })
                .project({ _id: 0, updatedAt: 0 })
                .toArray();

            return res.status(200).json({
                message: "Veteran resumes fetched successfully",
                resumes
            });
        }

        const totalResume = await resumesCollection.countDocuments()
        const resumes = await resumesCollection
            .find({}, { projection })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .toArray()
            
            return res.status(200).json({
                total: totalResume,
                page,
                pageSize: limit,
                resumes,
        })

    } catch (error) {
        console.error("Error fetching resume:", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function matchUserProfile(req, res) {
    try {
        const corporateId = req.user?.userId
        const { jobId, userId, resumeId } = req.query 

        if (!corporateId || !jobId || !userId || !resumeId) {
            return res.status(400).json({ message: "Corporate ID, Job ID, Resume ID, and User ID are required!" })
        }

        const usersCollection = await dbModel.getUsersCollection()
        const applicationsCollection = await dbModel.getApplicationsCollection()
        const jobsCollection = await dbModel.getJobsCollection()
        const resumesCollection = await dbModel.getResumesCollection()

        const exisitingCorporateUser = await usersCollection.findOne({ userId: corporateId })
        const existingUser = await usersCollection.findOne({ userId })
        const existingJob = await jobsCollection.findOne({ jobId })
        const existingResume = await resumesCollection.findOne({ resumeId })

        if (!exisitingCorporateUser || !existingUser || !existingJob || !existingResume) {
            return res.status(404).json({ message: "Corporate or User or Job or Resume not found!" })
        }

        let existingApplication = await applicationsCollection.findOne({ userId, corporateId, jobId, resumeId })

        if (existingApplication) {
            if (!existingApplication.corporateMatched) {
                const now = new Date(existingApplication.createdAt)
                const twentyEightDaysLater = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000)
                await applicationsCollection.updateOne(
                    { userId, corporateId, jobId, resumeId },
                    { 
                        $set: { 
                            corporateMatched: true, 
                            updatedAt: new Date(), 
                            status: {
                                code: 102,
                                message: "Mutually Matched"
                            },
                            expiredAt: twentyEightDaysLater
                        } 
                    }
                )
            }

            if (!existingApplication.corporateMatched && existingApplication.userMatched) {
                return res.status(200).json({ message: `User ${userId} and Corporate ${corporateId} are now matched for Job ${existingJob?.companyName}!` })
            }
        } else {
            const now = new Date();
            const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
            const newApplication = {
                applicationId: uuidv4(),
                userId,
                corporateId,
                jobId,
                resumeId,
                userMatched: false,
                corporateMatched: true,
                profileVideoUrl,
                status: {
                    code: 101,
                    message: "Corporate Matched"
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                expiredAt: fiveDaysLater
            };
            await applicationsCollection.insertOne(newApplication)
        }
        
        return res.status(200).json({ message: "Corporate matched the user's profile for the job!" })
        
    } catch (error) {
        console.error("Error matching user:", error)
        res.status(500).json({ message: "Internal server error" })
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

        const applicationsCollection = await dbModel.getApplicationsCollection();
        const resumesCollection = await dbModel.getResumesCollection();
        const jobsCollection = await dbModel.getJobsCollection();

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
            filter.veteranMatched = true;
        }

        const applications = await applicationsCollection.find(filter).toArray();

        if (!applications.length) {
            return res.status(200).json({ message: "No applications found.", applications: [] });
        }

        const resumeMap = new Map();
        const jobMap = new Map();

        if (isCorporate) {
            const resumeIds = [...new Set(applications.map(app => app.resumeId))];
            if (resumeIds.length) {
                const resumes = await resumesCollection
                    .find({ resumeId: { $in: resumeIds } })
                    .project({ resumeId: 1, name: 1, title: 1, 'contact.location': 1, profile: 1 })
                    .toArray();
                resumes.forEach(r => resumeMap.set(r.resumeId, r));
            }
        }

        if (isVeteran) {
            const jobIds = [...new Set(applications.map(app => app.jobId))];
            if (jobIds.length) {
                const jobs = await jobsCollection
                    .find({ jobId: { $in: jobIds } })
                    .project({ jobId: 1, role: 1, companyName: 1, address: 1, postedMethod: 1, data: 1 })
                    .toArray();
                jobs.forEach(j => jobMap.set(j.jobId, j));
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
                profileVideoUrl: app?.profileVideoUrl,
                status: app.status,
                appliedAt: app.createdAt,
                expiredAt: app.expiredAt
            };

            if (isCorporate) {
                const resume = resumeMap.get(app.resumeId);
                result.resume = resume
                    ? { ...resume }
                    : null;
            }

            if (isVeteran) {
                const job = jobMap.get(app.jobId);
                result.job = job
                    ? {
                        title: job.title,
                        company: job.company,
                        location: job.location
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

async function requestProfileVideo(req,res) {
    try {
        const user = req.user
        const applicationId = req.query?.applicationId

        const applicationsCollection = await dbModel.getApplicationsCollection()
        const usersCollection = await dbModel.getUsersCollection()

        const existingApplication = await applicationsCollection.findOne({ applicationId })
        
        if (!existingApplication) {
            return res.status(404).json({ message: "Application not Found!" })
        }

        await applicationsCollection.updateOne(
            { applicationId },
            {
                $set: { 
                    status: {
                        code: 103,
                        message: "Video Requested"
                    },
                    updatedAt: new Date()
                }
            }
        )
        await usersCollection.updateOne(
            { userId: user.userId },
            {
                $inc: { 'planData.profileVideoViewCount': 1 },
                $set: { updatedAt: new Date() }
            }
        )
        
        return res.status(200).json({ message: "Video Requested successfully"})
    } catch (error) {
        console.error("Error requesting video : ", error)
        res.status(500).json({ message: "Internal Server Error" })
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
    requestProfileVideo
}
