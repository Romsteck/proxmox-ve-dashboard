import { MongoClient, Db, Collection, Document, InsertOneResult, ObjectId } from "mongodb";

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
    
    // Logs détaillés pour le diagnostic
    console.log("[DEBUG GET] Informations de connexion:", {
      mongoUri: MONGO_URI,
      dbName: DB_NAME,
      collectionName: COLLECTION_NAME,
      clientConnected: !!client,
      dbInstance: !!db,
      timestamp: new Date().toISOString()
    });
    
    console.log(`mongoServerService: Fetching servers from collection '${COLLECTION_NAME}'`);
    const servers = await collection.find({}).toArray();
    
    console.log(`mongoServerService: Found ${servers.length} servers`);
    console.log("[DEBUG getServers] Détails des serveurs récupérés:", servers.map(s => ({
      _id: s._id,
      _id_type: typeof s._id,
      _id_toString: s._id?.toString(),
      _id_isObjectId: s._id?.constructor?.name === 'ObjectId',
      host: s.host,
      port: s.port,
      hasValidObjectIdFormat: s._id && /^[0-9a-fA-F]{24}$/.test(s._id.toString())
    })));
    
    // Test spécifique pour l'ID problématique
    const problematicId = "68a5ce9516db07fdd1d2c986";
    const foundServer = servers.find(s => s._id?.toString() === problematicId);
    console.log(`[DEBUG GET] Serveur avec ID ${problematicId}:`, {
      found: !!foundServer,
      server: foundServer ? {
        _id: foundServer._id,
        _id_toString: foundServer._id?.toString(),
        _id_constructor: foundServer._id?.constructor?.name,
        host: foundServer.host,
        port: foundServer.port
      } : null
    });

    // NOUVEAU : Horodatage pour tracer les récupérations de liste
    console.log("[DEBUG GET] Horodatage de récupération:", {
      timestamp: new Date().toISOString(),
      serverCount: servers.length,
      collectionName: COLLECTION_NAME,
      dbName: DB_NAME
    });
    
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

/**
 * Update a server document by ID using the singleton connection.
 * @param id The server ID (string format).
 * @param updateData The data to update.
 * @returns The updated document, or null if not found/failed.
 */
export async function updateServer(id: string, updateData: Document): Promise<Document | null> {
  try {
    console.log("[DEBUG updateServer] Début de la mise à jour:", {
      id,
      type: typeof id,
      length: id?.length,
      isValidObjectId: id && /^[0-9a-fA-F]{24}$/.test(id),
      updateData,
      timestamp: new Date().toISOString()
    });

    if (!id) {
      console.error("[DEBUG updateServer] ID manquant");
      throw new Error("ID du serveur manquant");
    }

    if (Object.keys(updateData).length === 0) {
      console.error("[DEBUG updateServer] Aucune donnée de mise à jour fournie");
      throw new Error("Aucune donnée de mise à jour fournie");
    }

    const db = await getDb();
    const collection: Collection = db.collection(COLLECTION_NAME);

    // Logs détaillés pour le diagnostic de connexion
    console.log("[DEBUG updateServer] Informations de connexion:", {
      mongoUri: MONGO_URI,
      dbName: DB_NAME,
      collectionName: COLLECTION_NAME,
      clientConnected: !!client,
      dbInstance: !!db,
      timestamp: new Date().toISOString()
    });

    // Logique simplifiée et plus robuste pour la gestion des IDs
    let query: any;
    
    // D'abord, essayer de créer un ObjectId si le format est valide
    if (ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id) };
      console.log("[DEBUG updateServer] Utilisation d'ObjectId pour la recherche:", query._id.toString());
    } else {
      // Si ce n'est pas un ObjectId valide, essayer en tant que string
      query = { _id: id };
      console.log("[DEBUG updateServer] Utilisation de string pour la recherche:", id);
    }

    // Ajouter un timestamp pour traçabilité
    const updatedData = {
      ...updateData,
      updatedAt: new Date()
    };

    const result = await collection.findOneAndUpdate(
      query,
      { $set: updatedData },
      { returnDocument: "after" }
    );

    console.log("[DEBUG updateServer] Résultat de la requête MongoDB:", {
      found: !!result?.value,
      query: query._id?.toString ? query._id.toString() : query._id,
      result: result?.value ? "Document trouvé et mis à jour" : "Aucun document trouvé"
    });

    if (result && result.value) {
      console.log("[DEBUG updateServer] Serveur mis à jour avec succès:", {
        updatedServer: {
          _id: result.value._id?.toString(),
          host: result.value.host,
          port: result.value.port,
          username: result.value.username,
          updatedAt: result.value.updatedAt
        },
        timestamp: new Date().toISOString()
      });
      return result.value;
    } else {
      console.error("[DEBUG updateServer] Aucun serveur trouvé avec l'ID:", {
        searchedIdOriginal: id,
        searchedQuery: query._id?.toString ? query._id.toString() : query._id,
        timestamp: new Date().toISOString(),
        message: "Le serveur a peut-être été supprimé par un autre processus ou utilisateur"
      });
      return null;
    }
  } catch (error) {
    console.error("[DEBUG updateServer] Erreur générale:", {
      id,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    throw error;
  }
}

/**
 * Delete a server document by ID using the singleton connection.
 * @param id The server ID (string format).
 * @returns True if deleted, false if not found.
 */
export async function deleteServer(id: string): Promise<boolean> {
  try {
    console.log("[DEBUG deleteServer] Début de la suppression:", {
      id,
      type: typeof id,
      length: id?.length,
      isValidObjectId: id && /^[0-9a-fA-F]{24}$/.test(id),
      timestamp: new Date().toISOString()
    });

    if (!id) {
      console.error("[DEBUG deleteServer] ID manquant");
      throw new Error("ID du serveur manquant");
    }

    const db = await getDb();
    const collection: Collection = db.collection(COLLECTION_NAME);

    let objectId;
    try {
      objectId = new ObjectId(id);
      console.log("[DEBUG deleteServer] ObjectId créé avec succès:", objectId.toString());
    } catch (objectIdError) {
      console.error("[DEBUG deleteServer] Erreur création ObjectId:", {
        id,
        error: (objectIdError as Error).message
      });
      throw new Error("ID du serveur invalide (format ObjectId requis)");
    }

    const result = await collection.deleteOne({ _id: objectId });
    
    console.log("[DEBUG deleteServer] Résultat de la suppression:", {
      deletedCount: result.deletedCount,
      acknowledged: result.acknowledged
    });

    if (result.deletedCount === 1) {
      console.log("mongoServerService: Server deleted successfully");
      return true;
    } else {
      console.error("[DEBUG deleteServer] Aucun serveur trouvé avec l'ID:", objectId.toString());
      return false;
    }
  } catch (error) {
    console.error("[DEBUG deleteServer] Erreur générale:", {
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    throw error;
  }
}
