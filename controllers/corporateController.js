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

async function subscription(req, res) {
  try {
      const userId = req.user?.userId;
      const { newPlan } = req.query; 

      if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
      }

      if (!newPlan || !["standard", "enterprise"].includes(newPlan)) {
          return res.status(400).json({ message: "Invalid subscription plan" });
      }

      const usersCollection = await dbModel.getUsersCollection();
      const user = await usersCollection.findOne({ userId });

      if (!user || !user.role.startsWith("corporate")) {
          return res.status(403).json({ message: "Access Denied: Only corporate users can upgrade" });
      }

      const newRole = `corporate_${newPlan}`;

      await usersCollection.updateOne(
          { userId },
          {
            $set: { 
            role: newRole, 
            subscribedAt: new Date(),
            ...(user.role === "corporate_free" && { resumeViews: 0 }) 
          }
        }  
      );

      return res.status(200).json({ message: `Subscription upgraded to ${newPlan}` });

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


module.exports = { 
    profileUpdate,
    addJobCard,
    getJobCards,
    updateJobCard,
    subscription
}
