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
    const db = await getDb();
    const collection: Collection = db.collection(COLLECTION_NAME);
    const servers = await collection.find({}).toArray();
    return servers;
  } catch (error) {
    console.error("Error fetching servers:", error);
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
    const db = await getDb();
    const collection: Collection = db.collection(COLLECTION_NAME);
    const result: InsertOneResult<Document> = await collection.insertOne(server);
    if (result.acknowledged) {
      // Fetch and return the inserted document
      const inserted = await collection.findOne({ _id: result.insertedId });
      return inserted || null;
    } else {
      console.error("Insert not acknowledged:", result);
      return null;
    }
  } catch (error) {
    console.error("Error adding server:", error);
    return null;
  }
}