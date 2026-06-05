import { CosmosClient } from "@azure/cosmos";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { validateSessionToken } from "../../../config/auth-helper";

// Central database configurations
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

// Helper function to simulate sending Email notifications to the customer
async function sendEmailNotification(emailAddress, subject, message) {
  try {
    console.log("==================================================");
    console.log(`[EMAIL DISPATCH]`);
    console.log(`To: ${emailAddress}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${message}`);
    console.log("==================================================");
    // You can connect real SMTP / Resend / Nodemailer dispatch here if needed
  } catch (err) {
    console.error("Email Notification Error:", err);
  }
}

// GET Route: Fetch a booking by ID or list all bookings (admin secure check)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("id");
    const adminMode = searchParams.get("admin") === "true";
    const adminPassword = searchParams.get("password");

    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;

    // Admin secure verification
    if (adminMode) {
      if (!checkAdminAuth(request, adminPassword)) {
        return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
      }
    }

    if (endpoint && key) {
      const client = new CosmosClient({ endpoint, key });
      const database = client.database(databaseId);
      const container = database.container(containerId);

      if (bookingId) {
        // Fetch specific booking
        const { resources } = await container.items
          .query({
            query: "SELECT * FROM c WHERE c.id = @id AND c.clientEmail != 'chat-session'",
            parameters: [{ name: "@id", value: bookingId }]
          })
          .fetchAll();

        if (resources.length === 0) {
          return NextResponse.json({ error: "Booking not found." }, { status: 404 });
        }
        return NextResponse.json(resources[0]);
      } else if (adminMode) {
        // List all bookings for admin
        const { resources } = await container.items
          .query("SELECT * FROM c WHERE c.clientEmail != 'chat-session' ORDER BY c.createdAt DESC")
          .fetchAll();
        return NextResponse.json(resources);
      }
    } else {
      // Local fallback
      const filePath = path.join(process.cwd(), "data", "bookings.json");
      let bookings = [];
      if (fs.existsSync(filePath)) {
        try {
          bookings = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        } catch (err) {
          console.error(err);
        }
      }

      if (bookingId) {
        const item = bookings.find((b) => b.id === bookingId);
        if (!item) {
          return NextResponse.json({ error: "Booking not found." }, { status: 404 });
        }
        return NextResponse.json(item);
      } else if (adminMode) {
        return NextResponse.json(bookings);
      }
    }

    return NextResponse.json({ error: "Invalid request parameters." }, { status: 400 });
  } catch (error) {
    console.error("GET Booking API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST Route: Log upfront deposit or update payment/status
export async function POST(request) {
  try {
    const data = await request.json();
    const { 
      action, 
      bookingId, 
      status, 
      utr, 
      serviceType, 
      packageName, 
      price, 
      clientName, 
      clientEmail, 
      whatsapp, 
      projectDetails, 
      upiNote 
    } = data;

    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;

    let database, container;
    if (endpoint && key) {
      const client = new CosmosClient({ endpoint, key });
      const { database: db } = await client.databases.createIfNotExists({ id: databaseId });
      const { container: cnt } = await db.containers.createIfNotExists({
        id: containerId,
        partitionKey: { paths: ["/clientEmail"] },
      });
      database = db;
      container = cnt;
    }

    const localFilePath = path.join(process.cwd(), "data", "bookings.json");
    const getLocalBookings = () => {
      if (fs.existsSync(localFilePath)) {
        try {
          return JSON.parse(fs.readFileSync(localFilePath, "utf-8"));
        } catch (err) {
          console.error(err);
        }
      }
      return [];
    };
    const saveLocalBookings = (list) => {
      const dataDir = path.dirname(localFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
      }
      fs.writeFileSync(localFilePath, JSON.stringify(list, null, 2), "utf-8");
    };

    // ACTION: PAY REMAINING BALANCE (50%)
    if (action === "pay_balance") {
      if (!bookingId || !utr) {
        return NextResponse.json({ error: "Missing bookingId or UTR code." }, { status: 400 });
      }

      let bookingRecord;
      if (container) {
        // Query database
        const { resources } = await container.items
          .query({
            query: "SELECT * FROM c WHERE c.id = @id AND c.clientEmail != 'chat-session'",
            parameters: [{ name: "@id", value: bookingId }]
          })
          .fetchAll();

        if (resources.length === 0) {
          return NextResponse.json({ error: "Booking record not found in Cosmos DB." }, { status: 404 });
        }
        bookingRecord = resources[0];
        bookingRecord.remainingUtr = utr;
        bookingRecord.status = "fully_paid";
        bookingRecord.updatedAt = new Date().toISOString();

        // Update in Cosmos DB
        await container.items.upsert(bookingRecord);
      } else {
        // Local update
        const bookings = getLocalBookings();
        const index = bookings.findIndex((b) => b.id === bookingId);
        if (index === -1) {
          return NextResponse.json({ error: "Booking record not found locally." }, { status: 404 });
        }
        bookingRecord = bookings[index];
        bookingRecord.remainingUtr = utr;
        bookingRecord.status = "fully_paid";
        bookingRecord.updatedAt = new Date().toISOString();
        saveLocalBookings(bookings);
      }

      // Send Email confirmation for full payment
      const subject = `Final Payment Received - Cruz Dev`;
      const message = `Hello ${bookingRecord.clientName}!\n\n🌟 We have received your final 50% payment for your "${bookingRecord.packageName}" order. (UTR Ref: ${utr})\n\nWe are finalizing the packaging and delivering your files directly to your email address shortly!\n\nThank you for working with Cruz Dev.`;
      await sendEmailNotification(bookingRecord.clientEmail, subject, message);

      return NextResponse.json({ success: true, booking: bookingRecord, message: "Balance payment logged successfully." });
    }

    // ACTION: ADMIN UPDATE STATUS / CLOSE BOOKING
    if (action === "update_status") {
      const adminPassword = data.password || request.nextUrl.searchParams.get("password");
      if (!checkAdminAuth(request, adminPassword)) {
        return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
      }

      if (!bookingId || !status) {
        return NextResponse.json({ error: "Missing bookingId or status." }, { status: 400 });
      }

      let bookingRecord;
      if (container) {
        const { resources } = await container.items
          .query({
            query: "SELECT * FROM c WHERE c.id = @id AND c.clientEmail != 'chat-session'",
            parameters: [{ name: "@id", value: bookingId }]
          })
          .fetchAll();

        if (resources.length === 0) {
          return NextResponse.json({ error: "Booking not found." }, { status: 404 });
        }
        bookingRecord = resources[0];
        bookingRecord.status = status;
        bookingRecord.updatedAt = new Date().toISOString();
        await container.items.upsert(bookingRecord);
      } else {
        const bookings = getLocalBookings();
        const index = bookings.findIndex((b) => b.id === bookingId);
        if (index === -1) {
          return NextResponse.json({ error: "Booking not found." }, { status: 404 });
        }
        bookingRecord = bookings[index];
        bookingRecord.status = status;
        bookingRecord.updatedAt = new Date().toISOString();
        saveLocalBookings(bookings);
      }

      // Send Email update for status modification
      const subject = `Project Status Update - Cruz Dev`;
      let message = `Hello ${bookingRecord.clientName}!\n\nFrancisco has updated your project status to: [${status.toUpperCase()}].`;
      if (status === "ready_to_deliver") {
        message += `\n\n🚀 Your project is complete! Please open the booking chat widget on our website to pay the remaining 50% balance (₹${(bookingRecord.price / 2).toLocaleString("en-IN")}) and retrieve your assets.`;
      } else if (status === "closed") {
        message += `\n\n🌟 Your project has been closed and successfully delivered. Thank you!`;
      }
      await sendEmailNotification(bookingRecord.clientEmail, subject, message);

      return NextResponse.json({ success: true, booking: bookingRecord });
    }

    // DEFAULT: CREATE NEW BOOKING (50% Deposit Paid upfront)
    if (!packageName || !price || !clientName || !clientEmail || !utr) {
      return NextResponse.json({ error: "Missing required booking parameters." }, { status: 400 });
    }

    const bookingRecord = {
      id: `booking-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      serviceType,
      packageName,
      price: parseFloat(price),
      clientName,
      clientEmail,
      whatsapp: whatsapp || "",
      projectDetails: projectDetails || "No details provided.",
      upiNote,
      depositUtr: utr,
      remainingUtr: "",
      status: "deposit_paid", // Initial state
      createdAt: new Date().toISOString(),
    };

    if (container) {
      await container.items.create(bookingRecord);
    } else {
      const bookings = getLocalBookings();
      bookings.push(bookingRecord);
      saveLocalBookings(bookings);
    }

    // Send Email notification for deposit payment received
    const upfront = price / 2;
    const subject = `Booking Confirmed & Deposit Received - Cruz Dev`;
    const message = `Hello ${clientName}!\n\n🚀 Your booking for "${packageName}" has been received!\nWe have registered your 50% deposit payment of ₹${upfront.toLocaleString("en-IN")}. (UTR Ref: ${utr})\n\nFrancisco will start working on your project and keep you updated via email!`;
    await sendEmailNotification(clientEmail, subject, message);

    return NextResponse.json({
      success: true,
      booking: bookingRecord,
      message: "Deposit payment logged, order created.",
    });

  } catch (error) {
    console.error("Booking API POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
