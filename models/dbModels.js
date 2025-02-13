const { connectToDatabase } = require("../utils/db");

async function getUsersCollection() {
    const { db } = await connectToDatabase();
    return db.collection("Users"); 
}

module.exports = { 
    getUsersCollection 
};
