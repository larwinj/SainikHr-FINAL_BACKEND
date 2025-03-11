const { v4: uuidv4 } = require("uuid")
const passwordHasher = require("../utils/passwordHasher")
const dbModel = require("../models/dbModels")
const JWTToken = require("../utils/jwtToken")
const { verifyOtp } = require("../utils/otpService")

async function signUp(req,res) {
    try {
        const user = req.body
        const data = req.user
        const usersCollection = await dbModel.getUsersCollection()
        const existingUser = await usersCollection.findOne({ email: user.email })

        if(!verifyOtp(user.email,user.otp,data)) {
            return res.status(401).json({ message: "Invalid OTP" })
        }

        if (existingUser) {
            return res.status(403).json({ message: "User with this email already exists" })
        }

        const settings = {
            emailNotification: false,
            smsNotification: false,
            darkMode: false
        }

        const subscription = {
            resumeViews: 0,
            subscribedAt: new Date(),
            subscriptionType: "Free",
            expireAt: "",
        }

        user.userId = uuidv4()
        user.password = await passwordHasher.hashPassword(user.password)
        user.createdAt = new Date()
        user.updatedAt = new Date()
        user.settings = settings
        delete user.otp


        if(user.role !== "veteran") {
            user.subscription = subscription
        }

        await usersCollection.insertOne(user);

        return res.status(201).json({ message: "User registered successfully", userId: user.userId, token: JWTToken({ userId: user.userId, role: user.role, resumeViews: 0 },"1d")})
    } catch (error) {
        console.error("Error signup : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function logIn(req,res) {
    try {
        const user = req.body
        const usersCollection = await dbModel.getUsersCollection()
        const existingUser = await usersCollection.findOne({ email: user.email })

        if (!existingUser){
            return res.status(404).json({ message: "User does not exists!" })
        } 
        else if (!await passwordHasher.verifyPassword(user.password,existingUser.password)) {
            return res.status(401).json({ message: "Invalid Email or Password" })
        }
        else {
            return res.status(200).json({ message: "Login successful", userId: existingUser.userId, token: JWTToken({ userId: existingUser.userId, role: existingUser.role, resumeViews: existingUser?.subscription?.resumeViews },"1d")})
        }
    } catch (error) {
        console.error("Error : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function createResume(req,res) {
    try {
        const userId = req.user?.userId
        const data = req.body
        const usersCollection = await dbModel.getUsersCollection()
        const resumesCollection = await dbModel.getResumesCollection()
        const existingUser = await usersCollection.findOne({ userId })
        
        if (!existingUser){
            return res.status(404).json({ message: "User does not exists!" })
        } 
        
        data.resumeId = uuidv4()
        data.createdAt = new Date()
        data.updatedAt = new Date()

        userResumeData = {
            resumeId: data.resumeId,
            uploadedAt: new Date(),
            fileUrl: ""
        }
        
        await resumesCollection.insertOne(data)
        await usersCollection.updateOne(
            { userId },
            { $push: { resumes: userResumeData }, $set: { updatedAt : new Date()} }
        )

        return res.status(201).json({ message: "Resume added successfully!" })
    } catch (error) {
        console.error("Error signup : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}


//updation required
async function updateResume(req,res) {
    try {
        const data = req.body
        const resumesCollection = await dbModel.getResumesCollection()
        const existingResume = await resumesCollection.findOne({ resumeId : data.resumeId })
        
        if(!existingResume) {
            return res.status(404).json({ message: "Resume does not exists!" })
        }

        existingResume.updatedAt = new Date()
        
        await resumesCollection.replaceOne(
            { resumeId: data.resumeId }, 
            data 
        )
        
        return res.status(200).json({ message: "Resume updated successfully!" });
    } catch (error) {
        console.error("Error signup : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

//updation required
async function deleteResume(req,res) {
    try {
        const userId = req.user?.userId
        const data = req.body

        const usersCollection = await dbModel.getUsersCollection()
        const resumesCollection = await dbModel.getResumesCollection()

        const existingUser = await usersCollection.findOne({ userId })
        const existingResume = await resumesCollection.findOne({ resumeId : data.resumeId })

        if(!existingUser) {
            return res.status(404).json({ message: "User does not exists!" })
        }

        if(!existingResume) {
            return res.status(404).json({ message: "Resume does not exists!" })
        }

        await usersCollection.updateOne(
            { userId }, 
            { $pull: { resumes: data.resumeId } }
        )        
        await resumesCollection.deleteOne({ resumeId: data.resumeId })
        
        return res.status(200).json({ message: "Resume removed successfully!" });
    } catch (error) {
        console.error("Error signup : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

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

async function saveJob(req, res) {
    try {
        const jobId = req.params?.jobId;
        const userId = req.user?.userId;

        if (!jobId) {
            return res.status(400).json({ message: "Job ID is required!" });
        }

        const jobsCollection = await dbModel.getJobsCollection();
        const usersCollection = await dbModel.getUsersCollection();

        const existingJob = await jobsCollection.findOne({ jobId });
        if (!existingJob) {
            return res.status(404).json({ message: "Job doesn't exist!" });
        }

        const existingUser = await usersCollection.findOne({ userId });
        if (!existingUser) {
            return res.status(404).json({ message: "User doesn't exist!" });
        }

        const isAlreadySaved = existingUser.saved_jobs?.some(job => job.jobId === jobId);
        if (isAlreadySaved) {
            return res.status(400).json({ message: "Job is already saved!" });
        }

        const savedJob = { jobId, savedAt: new Date() };
        await usersCollection.updateOne(
            { userId },
            { $push: { saved_jobs: savedJob } }
        );

        return res.status(201).json({ message: "Job saved successfully!" });
    } catch (error) {
        console.error("Error saving job: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function removeSavedJob(req,res) {
    try {
        const jobId = req.params?.jobId;
        const userId = req.user?.userId;
        
        const jobsCollection = await dbModel.getJobsCollection();
        const usersCollection = await dbModel.getUsersCollection();
        
        if (!jobId) {
            return res.status(400).json({ message: "Job Id is required!" });
        }
        
        const existingJob = await jobsCollection.findOne({ jobId });
        
        if (!existingJob) {
            return res.status(404).json({ message: "Job doesn't exist!" });
        }

        const existingUser = await usersCollection.findOne({ userId });

        if (existingUser) {
            await usersCollection.updateOne(
                { userId }, 
                { $pull: { saved_jobs: { jobId } } }  
            )
        } else {
            return res.status(400).json({ message: "User doesn't exists!" })
        }
        return res.status(204).json();
    } catch (error) {
        console.error("Error signup : ", error)
        res.status(500).json({ message: "Internal Server Error" })
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

        const userId = req.user?.userId
        const usersCollection = await dbModel.getUsersCollection()

        const existingUser = await usersCollection.findOne({ userId })

        if(!existingUser) return res.status(404).json({ message: "User not found!" })

        if (!req.file) return res.status(400).json({ message: "No file uploaded!" })
    
        const videoUrl = await uploadVideoToS3(req.file)

        await usersCollection.updateOne(
            { userId }, 
            { $set: { profile_video_url: videoUrl } }
        )
        
        res.status(200).json({ message: "Upload successful!" })
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Upload failed!" });
    }
}

async function updateProfileVideo(req, res) {
    try {
        const userId = req.user?.userId;
        const usersCollection = await dbModel.getUsersCollection();

        const existingUser = await usersCollection.findOne({ userId });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        const oldVideoUrl = existingUser.profile_video_url;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded!" });
        }

        if (oldVideoUrl) {
            const oldVideoKey = oldVideoUrl.split(".com/")[1]; 
            await deleteVideoFromS3(oldVideoKey);
        }

        const videoUrl = await uploadVideoToS3(req.file);

        await usersCollection.updateOne(
            { userId },
            { $set: { profile_video_url: videoUrl } }
        );

        res.status(200).json({ message: "Profile video updated successfully!" });
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
            { $pull: { profile_video_url: oldVideoUrl } }
        );

        res.status(200).json({ message: "Profile video deleted successfully!" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getJobCards(req, res) {
  try {
      const { userId, jobType, minSalary, maxSalary, location, page = 1, limit = 10 } = req.query;
      const jobsCollection = await dbModel.getJobsCollection();
      
      let query = {}; 

      if (userId) {
          query.postedBy = userId;
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

      const totalJobs = await jobsCollection.countDocuments(query);

      return res.status(200).json({
          message: "Job Cards Retrieved Successfully",
          jobs: jobCards,
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



module.exports = { 
    signUp,
    logIn,
    createResume,
    updateResume,
    deleteResume,
    getResume,
    saveJob,
    removeSavedJob,
    getSavedJobs,
    uploadProfileVideo,
    getProfileVideo,
    updateProfileVideo,
    deleteProfileVideo,
    getJobCards
}
