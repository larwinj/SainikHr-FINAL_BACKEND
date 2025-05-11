const { connectToDatabase } = require("../utils/db")

async function getUsersCollection() {
    const { db } = await connectToDatabase()
    return db.collection("Users")
}

async function getResumesCollection() {
    const { db } = await connectToDatabase()
    return db.collection("Resumes")
}

async function getJobsCollection() {
    const { db } =  await connectToDatabase()
    return db.collection("Jobs")
}

async function getApplicationsCollection() {
    const { db } =  await connectToDatabase()
    return db.collection("Applications")
}

async function getCorporatePlansCollection() {
    const { db } =  await connectToDatabase()
    return db.collection("CorporatePlans")
}

module.exports = { 
    getUsersCollection,
    getResumesCollection,
    getJobsCollection,
    getApplicationsCollection,
    getCorporatePlansCollection
}
