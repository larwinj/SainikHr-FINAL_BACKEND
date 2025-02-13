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

        return res.status(201).json({ message: "User registered successfully", userId: user.userId, token: JWTToken(user.userId)})
    } catch (error) {
        console.error("Error signup : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
    
}


module.exports = { 
    signUp 
}
