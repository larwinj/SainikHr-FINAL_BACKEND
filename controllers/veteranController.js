const { v4: uuidv4 } = require("uuid")
const dbModel = require("../models/dbModels")
const { uploadVideoToS3, deleteVideoFromS3 } = require('../utils/s3Multer')

async function saveOrRemoveJob(req, res) {
    try {
        const jobId = req.query?.jobId
        const userId = req.user?.userId

        if (!jobId) {
            return res.status(400).json({ message: "Job ID is required!" })
        }

        const jobsCollection = await dbModel.getJobsCollection()
        const usersCollection = await dbModel.getUsersCollection()

        const existingJob = await jobsCollection.findOne({ jobId })
        if (!existingJob) {
            return res.status(404).json({ message: "Job doesn't exist!" })
        }

        const existingUser = await usersCollection.findOne({ userId })
        if (!existingUser) {
            return res.status(404).json({ message: "User doesn't exist!" })
        }

        const isAlreadySaved = existingUser.savedJobs?.some(job => job === jobId)

        if (isAlreadySaved) {
            await usersCollection.updateOne(
                { userId },
                { 
                    $pull: { savedJobs: jobId },
                    $set: { updatedAt: new Date() }
                }
            )
            return res.status(200).json({ message: "Job removed from saved list." })
        } else {
            if (existingUser.savedJobs?.length >= 20) {
                return res.status(400).json({ message: "You can save a maximum of 20 jobs." })
            }
            await usersCollection.updateOne(
                { userId },
                { 
                    $push: { savedJobs: jobId },
                    $set: { updatedAt: new Date() }
                }   
            )
            return res.status(201).json({ message: "Job saved successfully!" })
        }

    } catch (error) {
        console.error("Error save/remove job: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function createOrUpdateResume(req,res) {
    try {
        const userId = req.user?.userId
        const data = req.body
        const resumeId = req.query?.resumeId
        
        const usersCollection = await dbModel.getUsersCollection()
        const resumesCollection = await dbModel.getResumesCollection()
        
        const existingUser = await usersCollection.findOne({ userId })
        
        if (!existingUser) {
            return res.status(404).json({ message: "User does not exists!" })
        } 
        
        if (resumeId) {
            const existingResume = await resumesCollection.findOne({ resumeId })
            
            if (!existingResume) {
                return res.status(404).json({ message: "Resume not found!" })
            }
            
            const updatedResume = {
                resumeId: existingResume.resumeId,
                userId: existingResume.userId,
                name: existingResume.name,
                ...data,
                createdAt: existingResume.createdAt,
                updatedAt: new Date()
            }
            
            await resumesCollection.replaceOne({ resumeId }, updatedResume)
            return res.status(200).json({ message: "Resume updated successfully" })
        } else {
            const newResumeId = uuidv4()
            const resumeFormat = {
                resumeId: newResumeId,
                userId: userId,
                name: existingUser.name,
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            }
            
            await resumesCollection.insertOne(resumeFormat)
            
            await usersCollection.updateOne(
                { userId },
                {
                    $push: { resumes: newResumeId },
                    $set: { updatedAt: new Date() },
                }
            )
            return res.status(201).json({ message: "Resume created successfully" })
        }
    } catch (error) {
        console.error("Error create/update resume : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function deleteResume(req,res) {
    try {
        const userId = req.user?.userId
        const resumeId = req.query?.resumeId

        const usersCollection = await dbModel.getUsersCollection()
        const resumesCollection = await dbModel.getResumesCollection()

        const existingUser = await usersCollection.findOne({ userId })
        const existingResume = await resumesCollection.findOne({ resumeId })

        if(!existingUser || !existingResume) {
            return res.status(404).json({ message: "User or Resume does not exists!" })
        }

        await resumesCollection.deleteOne({ resumeId })
        await usersCollection.updateOne(
            { userId }, 
            { $pull: { resumes: resumeId } }
        )        
        return res.status(200).json({ message: "Resume removed successfully!" });
    } catch (error) {
        console.error("Error removing resume : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

//under this updation required

async function getResume(req,res) {
    try {
        const resumeId = req.params?.resumeId;
        const resumesCollection = await dbModel.getResumesCollection();
        
        let existingResume;
        
        if (resumeId) {
            existingResume = await resumesCollection.findOne({ resumeId });
            if (!existingResume) {
                return res.status(404).json({ message: "Resume does not exist!" });
            }
        } else {
            existingResume = await resumesCollection.find().toArray(); 
        }
        return res.status(200).json({ data: existingResume });        
    } catch (error) {
        console.error("Error signup : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function getProfile(req, res) {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required!" });
        }

        const usersCollection = await dbModel.getUsersCollection();
        const resumesCollection = await dbModel.getResumesCollection()
        const existingUser = await usersCollection.findOne({ userId });

        if (!existingUser) {
            return res.status(404).json({ message: "User doesn't exist!" });
        }

        const { resumes, profile_video_url } = existingUser;

        let latestResume = null;
        let formattedResumes = [];

        if (resumes && resumes.length > 0) {
            const resumeIds = resumes.map(resume => resume.resumeId);
            const resumesData = await resumesCollection.find({ resumeId: { $in: resumeIds } }).toArray();

            const resumeTitleMap = new Map();
            resumesData.forEach(resume => {
                resumeTitleMap.set(resume.resumeId, resume.title);
            });

            const sortedResumes = resumes.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
            const latestResumeId = sortedResumes[0].resumeId;
            const resumeData = await resumesCollection.findOne({ resumeId: latestResumeId });

            if (resumeData) {
                const { fileUrl, resumeId, createdAt, updatedAt, _id, ...filteredResume } = resumeData;
                latestResume = filteredResume;
            }

            formattedResumes = resumes.map(resume => ({
                title: resumeTitleMap.get(resume.resumeId) || "Unknown",
                fileUrl: resume.fileUrl
            }));
        }

        const userProfile = {
            profile_video_url,
            resumes: formattedResumes,
            ...latestResume, 
        };

        return res.status(200).json(userProfile);
    } catch (error) {
        console.error("Error fetching profile: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getSavedJobs(req, res) {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(400).json({ message: "User ID is required!" });
        }

        const jobsCollection = await dbModel.getJobsCollection();
        const usersCollection = await dbModel.getUsersCollection();

        const existingUser = await usersCollection.findOne({ userId });

        if (!existingUser) {
            return res.status(404).json({ message: "User doesn't exist!" });
        }

        const savedJobs = existingUser.saved_jobs || [];

        if (savedJobs.length === 0) {
            return res.status(200).json({ data: [], message: "No saved jobs found." });
        }

        const savedJobIds = savedJobs.map(job => job.jobId);

        const savedJobDetails = await jobsCollection.find({ jobId: { $in: savedJobIds } }).toArray();

        const result = savedJobDetails.map(job => {
            const savedJob = savedJobs.find(sj => sj.jobId === job.jobId);
            return { ...job, savedAt: savedJob?.savedAt };
        });

        return res.status(200).json({ data: result });
    } catch (error) {
        console.error("Error fetching saved jobs: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}


async function uploadProfileVideo(req, res) {
    try {
        const userId = req.user?.userId;
        const usersCollection = await dbModel.getUsersCollection();

        const existingUser = await usersCollection.findOne({ userId });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded!" });
        }

        if (existingUser.profile_video_url) {
            const oldVideoKey = existingUser.profile_video_url.split(".com/")[1]; 
            await deleteVideoFromS3(oldVideoKey);
        }

        const videoUrl = await uploadVideoToS3(req.file);

        await usersCollection.updateOne(
            { userId },
            { $set: { profile_video_url: videoUrl } }
        );

        res.status(200).json({ message: "Profile video uploaded successfully!" });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Upload failed!" });
    }
}

async function deleteProfileVideo(req, res) {
    try {
        const userId = req.user?.userId;
        const usersCollection = await dbModel.getUsersCollection();

        const existingUser = await usersCollection.findOne({ userId });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        const oldVideoUrl = existingUser.profile_video_url;

        if (oldVideoUrl) {
            const oldVideoKey = oldVideoUrl.split(".com/")[1]; 
            await deleteVideoFromS3(oldVideoKey);
        }

        await usersCollection.updateOne(
            { userId },
            { $set: { profile_video_url: null } }
        );

        res.status(200).json({ message: "Profile video deleted successfully!" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getJobCards(req, res) {
    try {
        const userId = req.user?.userId;
        const { corporateId, jobType, minSalary, maxSalary, location, page = 1, limit = 10 } = req.query;

        const jobsCollection = await dbModel.getJobsCollection();
        const applicationsCollection = await dbModel.getApplicationsCollection();
        const usersCollection = await dbModel.getUsersCollection();

        let query = {};

        if (corporateId) {
            query.postedBy = corporateId;
        }

        if (jobType) {
            query.jobType = jobType;
        }

        if (minSalary && maxSalary) {
            query.salary = { $gte: parseInt(minSalary), $lte: parseInt(maxSalary) };
        } else if (minSalary) {
            query.salary = { $gte: parseInt(minSalary) };
        } else if (maxSalary) {
            query.salary = { $lte: parseInt(maxSalary) };
        }

        if (location) {
            query.location = location;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const jobCards = await jobsCollection
            .find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();

        const jobIds = jobCards.map(job => job.jobId);
        let jobApplicationMap = new Map();

        if (userId) {
            const applications = await applicationsCollection
                .find({ userId, jobId: { $in: jobIds } })
                .toArray();

            applications.forEach(app => {
                jobApplicationMap.set(app.jobId, {
                    userMatched: app.userMatched || false,
                    corporateMatched: app.corporateMatched || false
                });
            });
        }

        const usersWithJobs = await usersCollection
            .find({ jobs: { $in: jobIds } })
            .project({ userId: 1, jobs: 1 })
            .toArray();

        const jobToUserMap = new Map();
        usersWithJobs.forEach(user => {
            user.jobs.forEach(jobId => {
                if (!jobToUserMap.has(jobId)) {
                    jobToUserMap.set(jobId, []);
                }
                jobToUserMap.get(jobId).push(user.userId);
            });
        });

        const jobsWithMatchFlag = jobCards.map(job => ({
            ...job,
            match : {
                userMatched: jobApplicationMap.get(job.jobId)?.userMatched || false,
                corporateMatched: jobApplicationMap.get(job.jobId)?.corporateMatched || false,
            },
            userIds: jobToUserMap.get(job.jobId) || []
        }));

        const totalJobs = await jobsCollection.countDocuments(query);

        return res.status(200).json({
            message: "Job Cards Retrieved Successfully",
            jobs: jobsWithMatchFlag,
            totalJobs,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalJobs / parseInt(limit)),
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getProfileVideo(req, res) {
    try {
        const userId = req.user?.userId;
        const anotherUserId = req.params?.userId;
        const usersCollection = await dbModel.getUsersCollection();

        let existingUser;

        if (!anotherUserId) {
            existingUser = await usersCollection.findOne({ userId });
        } else {
            existingUser = await usersCollection.findOne({ userId: anotherUserId }); 
        }

        if (!existingUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        if (!existingUser.profile_video_url) {
            return res.status(404).json({ message: "No profile video found!" });
        }

        res.status(200).json({ 
            message: "Profile video fetched successfully!", 
            profileVideoUrl: existingUser.profile_video_url
        });

    } catch (error) {
        console.error("Error fetching profile video:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function matchJob(req, res) {
    try {
        const userId = req.user?.userId;
        const { jobId, corporateId } = req.body;

        if (!userId || !jobId || !corporateId) {
            return res.status(400).json({ message: "User ID, Job ID, and Corporate ID are required!" });
        }

        const usersCollection = await dbModel.getUsersCollection();
        const applicationsCollection = await dbModel.getApplicationsCollection();

        const existingUser = await usersCollection.findOne({ userId });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        const corporateUser = await usersCollection.findOne({ userId: corporateId });
        if (!corporateUser) {
            return res.status(404).json({ message: "Corporate user not found!" });
        }

        
        let existingApplication = await applicationsCollection.findOne({ userId, corporateId, jobId });
        
        if (existingApplication) {
            if (!existingApplication.corporateMatched) {
                await applicationsCollection.updateOne(
                    { userId, corporateId, jobId },
                    { $set: { corporateMatched: true, updatedAt: new Date() } }
                );
            }

            if (existingApplication.userMatched && !existingApplication.corporateMatched) {
                return res.status(200).json({ message: `User ${userId} and Corporate ${corporateId} are now matched for Job ${jobId}!`, isMatched: true });
            }
        } else {
            const newApplication = {
                applicationId: uuidv4(),
                userId,
                corporateId,
                jobId,
                userMatched: false,
                corporateMatched: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await applicationsCollection.insertOne(newApplication);
        }
        return res.status(200).json({ message: "The profile is matched!", isMatched: false});

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = { 
    saveOrRemoveJob,
    getProfile,
    createOrUpdateResume,
    deleteResume,
    getResume,
    getSavedJobs,
    uploadProfileVideo,
    getProfileVideo,
    deleteProfileVideo,
    getJobCards,
    matchJob,
}
