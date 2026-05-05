const { MongoClient } = require("mongodb");

const URI = "mongodb://mongodb:27018/ledger";
const DB_NAME = "ledger";
const COLLECTION = "ledgers";

const INTERVAL = 10000; // run every 10 seconds

async function checkLatency() {
    const client = new MongoClient(URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION);

        const result = await collection.aggregate([
            {
                $group: {
                    _id: null,
                    firstTimestamp: { $min: "$timestamp" },
                    lastTimestamp: { $max: "$timestamp" }
                }
            },
            {
                $addFields: {
                    latencyMs: {
                        $subtract: ["$lastTimestamp", "$firstTimestamp"]
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    latencyMs: 1,
                    latencySeconds: { $divide: ["$latencyMs", 1000] },
                    latencyMinutes: { $divide: ["$latencyMs", 60000] }
                }
            }
        ]).toArray();

        console.log("📊 Latency:", result[0]);
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await client.close();
    }
}

// run repeatedly
setInterval(checkLatency, INTERVAL);

// run immediately once
checkLatency();