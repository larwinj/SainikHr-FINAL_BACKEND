const { v4: uuidv4 } = require("uuid")
const passwordHasher = require("../utils/passwordHasher")
const dbModel = require("../models/dbModels")
const JWTToken = require("../utils/jwtToken")

async function signUp(req,res) {
    try {
        const user = req.body
        const usersCollection = await dbModel.getUsersCollection()
        const existingUser = await usersCollection.findOne({ email: user.email })

        if (existingUser) {
            return res.status(403).json({ message: "User with this email already exists" })
        }

        user.userId = uuidv4()
        user.password = await passwordHasher.hashPassword(user.password)

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
        
        await resumesCollection.insertOne(data)
        await usersCollection.updateOne(
            { userId },
            { $push: { resumes: data.resumeId } }
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
        const resumeId = req.params?.resumeId
        const resumesCollection = await dbModel.getResumesCollection()
        const existingResume = await resumesCollection.findOne({ resumeId })

        if(!existingResume) {
            return res.status(404).json({ message: "Resume does not exists!" })
        }

        return res.status(200).json({ data : existingResume })
    } catch (error) {
        console.error("Error signup : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}


module.exports = { 
    signUp,
    logIn,
    createResume,
    updateResume,
    deleteResume,
    getResume
}
