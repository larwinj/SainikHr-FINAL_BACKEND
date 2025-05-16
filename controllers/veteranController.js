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

async function getSavedJobs(req, res) {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const usersCollection = await dbModel.getUsersCollection();
        const jobsCollection = await dbModel.getJobsCollection();

        const existingUser = await usersCollection.findOne({ userId: user.userId });

        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const savedJobIds = existingUser?.savedJobs || [];

        if (savedJobIds.length === 0) {
            return res.status(404).json({ message: "No saved jobs found" });
        }

        const totalJobs = await jobsCollection.countDocuments({ jobId: { $in: savedJobIds } });

        const jobs = await jobsCollection
            .find({ jobId: { $in: savedJobIds } })
            .project({
                _id: 0,
                updatedAt: 0
            })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .toArray();

        return res.status(200).json({
            total: totalJobs,
            page,
            pageSize: limit,
            jobs
        });

    } catch (error) {
        console.error("Error fetching saved jobs: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function matchCorporateJob(req, res) {
    try {
        const userId = req.user?.userId;
        const { jobId, corporateId, resumeId } = req.query;

        if (!userId || !jobId || !resumeId || !corporateId) {
            return res.status(400).json({ message: "User ID, Job ID, Resume ID, and Corporate ID are required!" });
        }

        const usersCollection = await dbModel.getUsersCollection();
        const applicationsCollection = await dbModel.getApplicationsCollection();
        const jobsCollection = await dbModel.getJobsCollection();
        const resumesCollection = await dbModel.getResumesCollection();

        const existingUser = await usersCollection.findOne({ userId });
        const existingJob = await jobsCollection.findOne({ jobId });
        const existingResume = await resumesCollection.findOne({ resumeId });
        const existingCorporate = await usersCollection.findOne({ userId: corporateId });

        if (!existingUser || !existingJob || !existingResume || !existingCorporate) {
            return res.status(404).json({ message: "User, Job, Resume, or Corporate not found!" });
        }

        const profileVideoUrl = null;

        let existingApplication = await applicationsCollection.findOne({ userId, jobId, corporateId, resumeId });

        if (existingApplication) {
            if (!existingApplication.userMatched) {
                const now = new Date(existingApplication.createdAt);
                const expiredAt = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

                await applicationsCollection.updateOne(
                    { userId, jobId, corporateId, resumeId },
                    {
                        $set: {
                            userMatched: true,
                            updatedAt: new Date(),
                            status: "Matched",
                            expiredAt
                        }
                    }
                );
            }

            if (!existingApplication.userMatched && existingApplication.corporateMatched) {
                return res.status(200).json({ message: `You are now matched with ${existingCorporate.name} for the job ${existingJob.title}!` });
            }
        } else {
            const now = new Date();
            const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
            const newApplication = {
                applicationId: uuidv4(),
                userId,
                jobId,
                corporateId,
                resumeId,
                userMatched: true,
                corporateMatched: false,
                profileVideoUrl,
                status: "User Matched",
                createdAt: new Date(),
                updatedAt: new Date(),
                expiredAt: fiveDaysLater
            };

            await applicationsCollection.insertOne(newApplication);
        }

        return res.status(200).json({ message: "You've successfully matched yourself to the job!" });

    } catch (error) {
        console.error("Error matching to job: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

//under this updation required
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


module.exports = { 
    saveOrRemoveJob,
    getProfile,
    createOrUpdateResume,
    deleteResume,
    getSavedJobs,
    uploadProfileVideo,
    getProfileVideo,
    deleteProfileVideo,
    matchCorporateJob,
}
