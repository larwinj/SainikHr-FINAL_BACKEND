const { v4: uuidv4 } = require("uuid")
const dbModel = require("../models/dbModels")

async function profileUpdate(req,res) {
    try {
        const userId = req.user?.userId
        const data = req.body
        const usersCollection = await dbModel.getUsersCollection()
        const existingUser = await usersCollection.findOne({ userId })

        if (!existingUser) {
            return res.status(404).json({ message: "User not Found!" })
        }

        const updatedData = { ...existingUser, ...data }
        updatedData.updatedAt = new Date()

        if(updatedData.subscriptionPlan === "Basic") {
            updatedData.trailViewCount = 5
            updatedData.isTrailUsedUp = false
        }

        await usersCollection.replaceOne(
            { userId }, 
            updatedData
        )

        return res.status(200).json({ message: "Profile updated successfully"})
    } catch (error) {
        console.error("Error : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function addJobCard(req,res) {
    try {
        const userId = req.user?.userId
        const data = req.body
        const jobsCollection = await dbModel.getJobsCollection()
        const usersCollection = await dbModel.getUsersCollection()

        const existingUser = await usersCollection.findOne({ userId })

        if (!existingUser) {
            return res.status(404).json({ message: "User not Found!" })
        }

        data.jobId = uuidv4()
        data.createdAt = new Date()
        data.updatedAt = new Date()
        await jobsCollection.insertOne(data)

        await usersCollection.updateOne(
            { userId }, 
            { $push : { jobs: data.jobId }}
        )

        return res.status(201).json({ message: "Job Card Added Successfully" })
    } catch (error) {
        console.error("Error : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function updateJobCard(req, res) {
    try {
      const jobId = req.params?.id;
      const updatedData = req.body; 
  
      if (!jobId || jobId === "") {
        return res.status(400).json({ message: "JobId is required" });
      }
  
      const jobsCollection = await dbModel.getJobsCollection();
      const existingJob = await jobsCollection.findOne({ jobId });
  
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found" });
      }

      delete updatedData.jobId;
  
      await jobsCollection.updateOne(
        { jobId },
        {
          $set: {
            ...updatedData,
            updatedAt: new Date(), 
          },
        }
      );
  
      return res.status(200).json({ message: "Job Card Updated Successfully" });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getJobCards(req, res) {
    try {
      const userId = req.user?.userId;
      const usersCollection = await dbModel.getUsersCollection();
      const jobsCollection = await dbModel.getJobsCollection();
  
      const existingUser = await usersCollection.findOne({ userId });
  
      if (!existingUser) {
        return res.status(404).json({ message: "User not Found!" });
      }
  
      if (!existingUser.jobs || existingUser.jobs.length === 0) {
        return res.status(200).json({ message: "No jobs found for this user.", jobs: [] });
      }
  
      const jobCards = await jobsCollection
        .find({ jobId: { $in: existingUser.jobs } })
        .toArray();
  
      return res.status(200).json({
        message: "Job Cards Retrieved Successfully",
        jobs: jobCards,
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = { 
    profileUpdate,
    addJobCard,
    getJobCards,
    updateJobCard
}
