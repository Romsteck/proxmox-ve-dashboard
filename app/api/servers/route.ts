import { NextRequest, NextResponse } from 'next/server';
import { getServers, addServer } from '@/lib/services/mongoServerService';

// GET /api/servers - List all servers
export async function GET(req: NextRequest) {
  try {
    const servers = await getServers();
    return NextResponse.json({ servers }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch servers', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/servers - Add a new server
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const newServer = await addServer(data);
    return NextResponse.json({ server: newServer }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add server', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/servers - Supprime un serveur par ID (ID dans le body)
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: "ID du serveur manquant dans le body" },
        { status: 400 }
      );
    }
    const { MongoClient, ObjectId } = await import("mongodb");
    const MONGO_URI = "mongodb://mongodb.mynetwk.biz/dashboard";
    const DB_NAME = "dashboard";
    const COLLECTION_NAME = "servers";
    const client = new MongoClient(MONGO_URI, {});
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: "Aucun serveur trouvé avec cet ID" },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Échec de la suppression du serveur", details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/servers - Modifie un serveur par ID (ID + données dans le body)
 */
export async function PUT(req: NextRequest) {
  try {
    const { id, ...updateData } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: "ID du serveur manquant dans le body" },
        { status: 400 }
      );
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Aucune donnée de mise à jour fournie" },
        { status: 400 }
      );
    }
    const { MongoClient, ObjectId } = await import("mongodb");
    const MONGO_URI = "mongodb://mongodb.mynetwk.biz/dashboard";
    const DB_NAME = "dashboard";
    const COLLECTION_NAME = "servers";
    const client = new MongoClient(MONGO_URI, {});
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );
    if (result && result.value) {
      return NextResponse.json({ server: result.value }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: "Aucun serveur trouvé avec cet ID" },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Échec de la modification du serveur", details: (error as Error).message },
      { status: 500 }
    );
  }
}