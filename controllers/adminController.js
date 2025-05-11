const dbModel = require("../models/dbModels")
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
                await corporatePlansCollection.replaceOne({ planId }, formattedCorporatePlans);
                message = "Corporate plan updated successfully";
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



module.exports = {
    createOrUpdatePlan,
    deletePlan,
    getPlans
}