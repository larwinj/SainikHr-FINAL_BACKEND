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

        user.userId = uuidv4()
        user.password = await passwordHasher.hashPassword(user.password)
        user.createdAt = new Date()
        user.updatedAt = new Date()
        delete user.otp

        if(user.role !== "veteran") {
            user.resumeViews = 0
        }

        await usersCollection.insertOne(user);

        return res.status(201).json({ message: "User registered successfully", userId: user.userId, token: JWTToken({ userId: user.userId, role: user.role },"1d")})
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
            return res.status(200).json({ message: "Login successful", userId: existingUser.userId, token: JWTToken({ userId: existingUser.userId, role: existingUser.role },"1d")})
        }
    } catch (error) {
        console.error("Error signup : ", error)
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
        
        await resumesCollection.insertOne(data)
        await usersCollection.updateOne(
            { userId },
            { $push: { resumes: data.resumeId }, $set: { updatedAt : new Date()} }
        )

        return res.status(201).json({ message: "Resume added successfully!" })
    } catch (error) {
        console.error("Error signup : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

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

async function saveJob(req,res) {
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
                { $push: { saved_jobs: jobId } }  
            );
        } else {
            return res.status(400).json({ message: "User doesn't exists!" })
        }
        return res.status(204).json();
    } catch (error) {
        console.error("Error signup : ", error)
        res.status(500).json({ message: "Internal Server Error" })
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
                { $pull: { saved_jobs: jobId } }  
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

        const savedJobIds = existingUser.saved_jobs || [];

        if (savedJobIds.length === 0) {
            return res.status(200).json({ data: [], message: "No saved jobs found." });
        }

        const savedResumes = await jobsCollection.find({ jobId: { $in: savedJobIds } }).toArray();

        return res.status(200).json({ data: savedResumes });
    } catch (error) {
        console.error("Error fetching saved jobs: ", error);
        res.status(500).json({ message: "Internal Server Error" });
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
    getSavedJobs
}
