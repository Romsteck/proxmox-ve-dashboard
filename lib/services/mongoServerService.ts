import { MongoClient, Db, Collection, Document, InsertOneResult } from "mongodb";

const MONGO_URI = "mongodb://mongodb.mynetwk.biz/dashboard";
const DB_NAME = "dashboard";
const COLLECTION_NAME = "servers";

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Get the singleton MongoDB client, connecting if necessary.
 */
async function getDb(): Promise<Db> {
  if (db && client) {
    return db;
  }
  try {
    client = new MongoClient(MONGO_URI, { });
    await client.connect();
    db = client.db(DB_NAME);
    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw new Error("Failed to connect to MongoDB");
  }
}

/**
 * Fetch all documents from the "servers" collection.
 * @returns Array of server documents.
 */
export async function getServers(): Promise<Document[]> {
  try {
    console.log("mongoServerService: Connecting to database...");
    const db = await getDb();
    const collection: Collection = db.collection(COLLECTION_NAME);
    console.log(`mongoServerService: Fetching servers from collection '${COLLECTION_NAME}'`);
    const servers = await collection.find({}).toArray();
    console.log(`mongoServerService: Found ${servers.length} servers`);
    return servers;
  } catch (error) {
    console.error("mongoServerService: Error fetching servers:", error);
    return [];
  }
}

/**
 * Insert a new document into the "servers" collection.
 * @param server The server document to insert.
 * @returns The inserted document, or null if failed.
 */
export async function addServer(server: Document): Promise<Document | null> {
  try {
    console.log("mongoServerService: Connecting to database for insert...");
    const db = await getDb();
    const collection: Collection = db.collection(COLLECTION_NAME);
    console.log(`mongoServerService: Adding server to collection '${COLLECTION_NAME}'`, server);
    const result: InsertOneResult<Document> = await collection.insertOne(server);
    if (result.acknowledged) {
      // Fetch and return the inserted document
      const inserted = await collection.findOne({ _id: result.insertedId });
      console.log("mongoServerService: Server added successfully", inserted);
      return inserted || null;
    } else {
      console.error("mongoServerService: Insert not acknowledged:", result);
      return null;
    }
  } catch (error) {
    console.error("mongoServerService: Error adding server:", error);
    return null;
  }
}