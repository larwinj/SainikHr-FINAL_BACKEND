const { generateOTP, sendOtpToEmail, generateOtpToken } = require("../utils/otpService")
const { verifyOtp } = require("../utils/otpService")
const JWTToken = require("../utils/jwtToken")
const passwordHasher = require("../utils/passwordHasher")
const dbModel = require("../models/dbModels")
const { v4: uuidv4 } = require("uuid")

async function signUp(req,res) {
    try {
        const user = req.body
        const data = req.user
        const planId = req.query?.planId
        const usersCollection = await dbModel.getUsersCollection()
        const corporatePlansCollection = await dbModel.getCorporatePlansCollection()
        const existingUser = await usersCollection.findOne({ email: user.email })
        let token
        let plan

        if(user.role !== "admin" && !verifyOtp(user.email,user.otp,data)) {
            return res.status(401).json({ message: "Invalid OTP" })
        }

        if (existingUser) {
            return res.status(403).json({ message: "User with this email already exists" })
        }

        if(planId) {
            plan = await corporatePlansCollection.findOne({ planId })
            if(!plan) {
                return res.status(403).json({ message: "Plan doesn't exists"})
            }
        }

        let userFormat = {
            userId: uuidv4(),
            name: {
                firstName: user.userName,
                middleName: null,
                lastName: null
            },
            email: user.email,
            password: await passwordHasher.hashPassword(user.password),
            role: user.role
        }

        if(user.role === "veteran") {
            userFormat = { 
                ...userFormat,
                userName: user.userName,
                jobsApplied: [],
                resumes: [],
                savedJobs: [],
            }
        } else if(user.role === "admin") {
            userFormat = { 
                ...userFormat,
                userName: user.userName,
                roleName: user.roleName,
                access:{
                    manageAdmins: user.manageAdmins,
                    manageUsers: user.manageUsers,
                    verifyCorporates: user.verifyCorporates,
                    manageJobs: user.manageJobs,
                    financialManagement: user.financialManagement,
                    managePlans: user.managePlans
                }
            }
        } else {
            const subscribedAt = new Date()
            let expireAt = null
            let planName = null

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
            userFormat = { 
                ...userFormat,
                companyName: user?.companyName,
                postedJobs: [],
                verified: false,
                planData: {
                    planId,
                    planName,
                    resumeViewCount: 0,
                    profileVideoViewCount: 0,
                    jobPostedCount: 0,
                    subscribedAt,
                    expireAt,
                }
            }
        }
        userFormat.createdAt = new Date()
        userFormat.updatedAt = new Date()

        await usersCollection.insertOne(userFormat)

        if(userFormat.role === "veteran") {
            token = JWTToken({ 
                userId: userFormat.userId, 
                role: userFormat.role, 
            },"1d")
        } else if(userFormat.role === "corporate") {
            token = JWTToken({
                userId: userFormat.userId,
                role: userFormat.role,
                planId: userFormat.planData.planId,
                expireAt: userFormat.planData.expireAt
            },"1d")
        } else {
            token = JWTToken({ 
                userId: userFormat.userId, 
                role: userFormat.role, 
                manageAdmins: userFormat.access.manageAdmins,
                manageUsers: userFormat.access.manageUsers,
                verifyCorporates: userFormat.access.verifyCorporates,
                manageJobs: userFormat.access.manageJobs,
                financialManagement: userFormat.access.financialManagement,
                managePlans: userFormat.access.managePlans
            },"1d")
        }

        return res.status(201).json({ message: "User registered successfully", userId: user.userId, token })
    } catch (error) {
        console.error("Error Signup : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function logIn(req,res) {
    try {
        const user = req.body
        const usersCollection = await dbModel.getUsersCollection()
        const existingUser = await usersCollection.findOne({ email: user.email })
        let token

        if (!existingUser){
            return res.status(404).json({ message: "User does not exists!" })
        } else if (existingUser?.message) {
            return res.status(403).json({ message: existingUser?.message })
        } else if (!await passwordHasher.verifyPassword(user.password,existingUser.password)) {
            return res.status(401).json({ message: "Invalid Email or Password" })
        } else {
            if(existingUser.role === "veteran") {
                token = JWTToken({ 
                    userId: existingUser.userId, 
                    role: existingUser.role, 
                },"1d")
            } else if(existingUser.role === "corporate") {
                token = JWTToken({
                    userId: existingUser.userId,
                    role: existingUser.role,
                    planId: existingUser.planData.planId,
                    expireAt: existingUser.planData.expireAt
                },"1d")
            } else {
                token = JWTToken({ 
                    userId: existingUser.userId, 
                    role: existingUser.role, 
                    manageAdmins: existingUser.access.manageAdmins,
                    manageUsers: existingUser.access.manageUsers,
                    verifyCorporates: existingUser.access.verifyCorporates,
                    manageJobs: existingUser.access.manageJobs,
                    financialManagement: existingUser.access.financialManagement,
                    managePlans: existingUser.access.managePlans
                },"1d")
            }
            return res.status(200).json({ message: "Login successful", userId: existingUser.userId, token})
        }
    } catch (error) {
        console.error("Error Login : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function deleteAccount(req,res) {
    try {
        const user = req.user
        const userId = req.query?.userId
        const password = req.query?.password

        const usersCollection = await dbModel.getUsersCollection()
        
        if (password) {
            const admin = await usersCollection.findOne({ userId: user.userId })
            const existingUser =  await usersCollection.findOne({ userId })
            if (!admin || admin.role !== "admin" || !admin.access.manageUsers || !existingUser) {
                return res.status(403).json({ message: "Unauthorized admin credentials" })
            }
            const isAdminPasswordValid = await passwordHasher.verifyPassword(password, admin.password)
            if (!isAdminPasswordValid) {
                return res.status(401).json({ message: "Invalid admin password" })
            }
            await usersCollection.deleteOne({ userId })
            await usersCollection.insertOne({ userId, email: existingUser.email, message: "Account deleted by admin" })
            return res.status(200).json({ message: "Account deleted by admin" })
        }

        const existingUser = await usersCollection.findOne({ userId: user.userId })

        if (!existingUser) {
            return res.status(404).json({ message: "User does not exist!" })
        }
        await usersCollection.deleteOne({ userId: user.userId })
        return res.status(200).json({ message: "Account deleted successfully" })
    } catch (error) {
        console.error("Error Deleting Account : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function resetPassword(req,res) {
    try {
        const user = req.body;
        const data = req.user;
        const usersCollection = await dbModel.getUsersCollection();
    
        const existingUser = await usersCollection.findOne({ email: user.email });
        if (!existingUser) {
          return res.status(404).json({ message: "User not found" });
        }
    
        if (!verifyOtp(user.email, user.otp, data)) {
          return res.status(401).json({ message: "Invalid OTP" });
        }
    
        const hashedPassword = await passwordHasher.hashPassword(user.password);
    
        await usersCollection.updateOne(
          { email: user.email },
          {
            $set: {
              password: hashedPassword,
              updatedAt: new Date()
            }
          }
        );
    
        return res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function sendOTP(req,res) {
    try {
        const data = req.query?.email

        if(!data || data === "") {
            return res.status(400).json({ message: "Email is required" })
        }

        const otp = generateOTP()
        await sendOtpToEmail(data,otp)

        const token = generateOtpToken(data,otp)
        return res.status(200).json({ message: "OTP Generated Successfully" , token })
    } catch (error) {
        console.error("Error OTP generation : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function googleRedirect(req,res) {
    try {
        const token = req.user.token;
        res.redirect(`/veteran?token=${token}`);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" })
    }
}

module.exports = {
    signUp,
    logIn,
    deleteAccount,
    resetPassword,
    sendOTP,
    googleRedirect
}