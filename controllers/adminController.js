const dbModel = require("../models/dbModels")
const planAccessCache = require('../utils/planAccessCache')
const { v4: uuidv4 } = require("uuid")

async function createOrUpdatePlan(req, res) {
    try {
        const data = req.body;
        const planId = req.query?.planId;
        const corporatePlansCollection = await dbModel.getCorporatePlansCollection();
        
        let formattedCorporatePlans;
        let message;

        if (planId) {
            const existingPlan = await corporatePlansCollection.findOne({ planId })
            if (existingPlan) {
                formattedCorporatePlans = {
                    planId: existingPlan.planId,
                    planName: data.planName,
                    access: data.access,
                    duration: data.duration,
                    cost: data.cost,
                    createdAt: existingPlan.createdAt,
                    updatedAt: new Date()
                }
                await corporatePlansCollection.replaceOne({ planId }, formattedCorporatePlans)
                message = "Corporate plan updated successfully"
            } else {
                return res.status(404).json({ message: "The Plan doesn't exists"})
            }
        } else {
            formattedCorporatePlans = {
                planId: uuidv4(),
                planName: data.planName,
                access: data.access,
                duration: data.duration,
                cost: data.cost,
                createdAt: new Date(),
                updatedAt: new Date()
            }
            await corporatePlansCollection.insertOne(formattedCorporatePlans)
            message = "Corporate plan inserted successfully"
        }
        planAccessCache.loadCorporatePlans()
        return res.status(200).json({ message })
        
    } catch (error) {
        console.error("Error inserting or updating corporate plan: ", error)
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function deletePlan(req, res) {
    try {
        const planId = req.query?.planId;
        const corporatePlansCollection = await dbModel.getCorporatePlansCollection()
        const existingPlan = await corporatePlansCollection.findOne({ planId })

        if (!existingPlan) {
            return res.status(404).json({ message: "The Plan doesn't exists"})
        } 

        await corporatePlansCollection.deleteOne({ planId })
        planAccessCache.loadCorporatePlans()
        return res.status(200).json({ message: `The Plan ${existingPlan.planName} is deleted` })
    } catch (error) {
        console.error("Error inserting or updating corporate plan: ", error)
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getPlans(req, res) {
    try {
        const { page = 1, limit = 10, planId } = req.query
        const user = req.user

        const corporatePlansCollection = await dbModel.getCorporatePlansCollection()
        const projection = (!user || user.role !== "admin" || user?.managePlans !== true)
            ? { _id: 0, createdAt: 0, updatedAt: 0 }
            : { _id: 0 }
            
        if (planId) {
            const plan = await corporatePlansCollection.findOne({ planId }, { projection })
            if (!plan) {
                return res.status(404).json({ message: "Plan not found" })
            }
            return res.status(200).json({
                message: "Corporate Plan Retrieved Successfully",
                plan,
            })
        }

        const skip = (parseInt(page) - 1) * parseInt(limit)
        const plans = await corporatePlansCollection
            .find({}, { projection })
            .skip(skip)
            .limit(parseInt(limit))
            .toArray()
        const totalPlans = await corporatePlansCollection.countDocuments()
        return res.status(200).json({
            message: "Corporate Plans Retrieved Successfully",
            plans,
            totalPlans,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalPlans / parseInt(limit)),
        })
    } catch (error) {
        console.error("Error fetching corporate plans: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function verifyCorporate(req, res) {
    try {
        const userId = req.query?.userId
        const usersCollection = await dbModel.getUsersCollection()
        const jobsCollection = await dbModel.getJobsCollection()

        const existingUser = await usersCollection.findOne({ userId })

        if (!existingUser) {
            return res.status(404).json({ message: "The User doesn't exist" })
        }

        const newStatus = !existingUser.verified

        await usersCollection.updateOne(
            { userId },
            { $set: { verified: newStatus } }
        )

        if (Array.isArray(existingUser.postedJobs) && existingUser.postedJobs.length > 0) {
            await jobsCollection.updateMany(
                { jobId: { $in: existingUser.postedJobs } },
                { $set: { 'data.postedBy.verified': newStatus } }
            )
        }

        const message = newStatus
            ? "The User is verified successfully"
            : "The User is revoked successfully"

        return res.status(200).json({ message })

    } catch (error) {
        console.error("Error verifying user: ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function deleteAdminAccount(req,res) {
    try {
        const user = req.user
        const userId = req.query?.userId

        const usersCollection = await dbModel.getUsersCollection()
        
        const admin = await usersCollection.findOne({ userId: user.userId })
        const existingUser =  await usersCollection.findOne({ userId })

        if (!admin || admin.role !== "admin" || !admin.access.manageAdmins || !existingUser) {
            return res.status(403).json({ message: "Unauthorized admin credentials" })
        }

        await usersCollection.deleteOne({ userId })
        await usersCollection.insertOne({ userId, email: existingUser.email, message: "Account deleted by admin" })
        return res.status(200).json({ message: "Account deleted by admin" })

    } catch (error) {
        console.error("Error Deleting Admin Account : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function fetchUserProfiles(req, res) {
    try {
        const user = req.user;
        const targetRole = req.query?.role;
        const page = parseInt(req.query?.page) || 1;
        const limit = parseInt(req.query?.limit) || 10;
        const skip = (page - 1) * limit;

        if (user.role !== 'admin') {
            return res.status(403).json({ message: "Only admins can access this endpoint." });
        }

        if (!targetRole) {
            return res.status(400).json({ message: "Target role is required in query." });
        }

        const allowedRoleAccess = {
            admin: user.manageAdmins,
            corporate: user.manageUsers || user.verifyCorporates,
            veteran: user.manageUsers
        };

        if (!allowedRoleAccess[targetRole]) {
            return res.status(403).json({ message: "You do not have access to this role's profiles." });
        }

        const usersCollection = await dbModel.getUsersCollection();
        const query = { role: targetRole };

        const projection = { _id: 0, password: 0 };

        const total = await usersCollection.countDocuments(query);
        const users = await usersCollection
            .find(query, { projection })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .toArray();

        return res.status(200).json({
            total,
            page,
            pageSize: limit,
            users
        });

    } catch (error) {
        console.error("Error fetching user profiles:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function updateAdminAccess(req, res) {
    try {
        const user = req.user;
        const userId = req.query?.userId
        const data = req.body

        const usersCollection = await dbModel.getUsersCollection();
        const targetAdmin = await usersCollection.findOne({ userId, role: 'admin' });

        if (!targetAdmin) {
            return res.status(404).json({ message: "Target admin user not found." });
        }

        await usersCollection.updateOne(
            { userId },
            {
                $set: {
                    roleName: data.roleName,
                    access: data.access,
                    updatedAt: new Date()
                }
            }
        );

        return res.status(200).json({ message: "Admin access updated successfully." });

    } catch (error) {
        console.error("Error updating admin access:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = {
    createOrUpdatePlan,
    deletePlan,
    getPlans,
    verifyCorporate,
    deleteAdminAccount,
    fetchUserProfiles,
    updateAdminAccess
}