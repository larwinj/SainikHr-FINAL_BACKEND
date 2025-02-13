const { MongoClient } = require('mongodb')

const uri = process.env.DB_URI
const dbName = process.env.DB_NAME

let client
let db

async function connectToDatabase() {
    try {
        if (!client) {
            client = new MongoClient(uri)
            await client.connect()
            db = client.db(dbName)
            console.log("Connected to database...")
        }
        return { client, db }
    } catch (err) {
        console.error("Database connection error:", err)
        throw err 
    }
}

process.on("SIGINT", async () => {
    if (client) {
        await client.close();
        console.log("MongoDB connection closed.");
        process.exit(0);
    }
});

module.exports = {
    connectToDatabase
}
