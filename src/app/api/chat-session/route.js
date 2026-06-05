import { CosmosClient } from "@azure/cosmos";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { validateSessionToken } from "../../../config/auth-helper";

const databaseId = process.env.COSMOS_DB_DATABASE_ID || "CruzStudio";
const containerId = process.env.COSMOS_DB_CONTAINER_ID || "Bookings";

// Auth helper for endpoint
function checkAdminAuth(request, adminPassword) {
  const azureAdEnabled = !!process.env.AZURE_AD_CLIENT_ID;
  if (azureAdEnabled) {
    const sessionToken = request.cookies.get("cruzdev_admin_session")?.value;
    const session = validateSessionToken(sessionToken);
    const adminEmail = process.env.ADMIN_EMAIL || "";

    if (session && (!adminEmail || session.email.toLowerCase() === adminEmail.toLowerCase())) {
      return true;
    }
  }

  // Fallback to password check
  const correctPassword = process.env.ADMIN_PASSWORD || "admin123";
  return adminPassword === correctPassword;
}

// GET Route: Fetch all active chat sessions (admin) or a single chat session
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");
    const adminMode = searchParams.get("admin") === "true";
    const adminPassword = searchParams.get("password");

    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;

    if (adminMode && !checkAdminAuth(request, adminPassword)) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    if (endpoint && key) {
      const client = new CosmosClient({ endpoint, key });
      const database = client.database(databaseId);
      const container = database.container(containerId);

      if (sessionId) {
        // Fetch specific chat session
        const { resources } = await container.items
          .query({
            query: "SELECT * FROM c WHERE c.id = @id AND c.clientEmail = 'chat-session'",
            parameters: [{ name: "@id", value: sessionId }]
          })
          .fetchAll();

        if (resources.length === 0) {
          return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
        }
        return NextResponse.json(resources[0]);
      } else if (adminMode) {
        // List all chat sessions for admin (partitionKey is 'chat-session')
        const { resources } = await container.items
          .query({
            query: "SELECT * FROM c WHERE c.clientEmail = 'chat-session' ORDER BY c.updatedAt DESC"
          })
          .fetchAll();
        return NextResponse.json(resources);
      }
    } else {
      // Local fallback file
      const filePath = path.join(process.cwd(), "data", "chats.json");
      let chats = [];
      if (fs.existsSync(filePath)) {
        try {
          chats = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        } catch (err) {
          console.error(err);
        }
      }

      if (sessionId) {
        const item = chats.find((c) => c.id === sessionId);
        if (!item) {
          return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
        }
        return NextResponse.json(item);
      } else if (adminMode) {
        // Sort local chats by updatedAt DESC
        chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        return NextResponse.json(chats);
      }
    }

    return NextResponse.json({ error: "Invalid request parameters." }, { status: 400 });
  } catch (error) {
    console.error("GET Chat Session API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST Route: Save/Sync active chat session
export async function POST(request) {
  try {
    const data = await request.json();
    const { 
      sessionId, 
      messages, 
      step, 
      bookingData, 
      clientName, 
      realEmail, 
      isOrderPlaced 
    } = data;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter." }, { status: 400 });
    }

    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;

    const chatRecord = {
      id: sessionId,
      clientEmail: "chat-session", // Fixed partition key in Cosmos DB for chats
      clientName: clientName || bookingData?.clientName || "Anonymous Guest",
      realEmail: realEmail || bookingData?.clientEmail || "",
      messages: messages || [],
      step: step || "init",
      bookingData: bookingData || {},
      isOrderPlaced: !!isOrderPlaced,
      updatedAt: new Date().toISOString(),
    };

    if (endpoint && key) {
      const client = new CosmosClient({ endpoint, key });
      const database = client.database(databaseId);
      const container = database.container(containerId);

      // Save/Upsert chat log
      await container.items.upsert(chatRecord);
    } else {
      // Local fallback
      const filePath = path.join(process.cwd(), "data", "chats.json");
      const dataDir = path.dirname(filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
      }

      let chats = [];
      if (fs.existsSync(filePath)) {
        try {
          chats = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        } catch (err) {
          console.error(err);
        }
      }

      const index = chats.findIndex((c) => c.id === sessionId);
      if (index > -1) {
        chats[index] = chatRecord;
      } else {
        chats.push(chatRecord);
      }

      fs.writeFileSync(filePath, JSON.stringify(chats, null, 2), "utf-8");
    }

    return NextResponse.json({ success: true, chat: chatRecord });
  } catch (error) {
    console.error("POST Chat Session API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE Route: Delete a specific chat session from database
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");
    const adminPassword = searchParams.get("password");

    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing id parameter." }, { status: 400 });
    }

    // Secondary auth check
    if (!checkAdminAuth(request, adminPassword)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (endpoint && key) {
      const client = new CosmosClient({ endpoint, key });
      const database = client.database(databaseId);
      const container = database.container(containerId);

      // Delete item using id and partitionKey 'chat-session'
      await container.item(sessionId, "chat-session").delete();
    } else {
      // Local fallback
      const filePath = path.join(process.cwd(), "data", "chats.json");
      if (fs.existsSync(filePath)) {
        try {
          let chats = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          chats = chats.filter((c) => c.id !== sessionId);
          fs.writeFileSync(filePath, JSON.stringify(chats, null, 2), "utf-8");
        } catch (err) {
          console.error(err);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Chat Session API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
