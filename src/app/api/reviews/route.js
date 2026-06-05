import { CosmosClient } from "@azure/cosmos";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Central database configurations
const databaseId = process.env.COSMOS_DB_DATABASE_ID || "CruzStudio";
const containerId = "Reviews";

// Preseeded mock reviews for a beautiful initial layout
const MOCK_REVIEWS = [];

export async function GET() {
  try {
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;

    if (endpoint && key) {
      const client = new CosmosClient({ endpoint, key });
      const { database } = await client.databases.createIfNotExists({ id: databaseId });
      const { container } = await database.containers.createIfNotExists({
        id: containerId,
        partitionKey: { paths: ["/id"] },
      });

      const { resources } = await container.items
        .query("SELECT * from c ORDER BY c.createdAt DESC")
        .fetchAll();

      // Filter out any previously seeded mock reviews
      const filtered = resources.filter(
        (rev) => !["review-1", "review-2", "review-3"].includes(rev.id)
      );

      return NextResponse.json(filtered);
    } else {
      // Local fallback
      const dataDir = path.join(process.cwd(), "data");
      const filePath = path.join(dataDir, "reviews.json");

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
      }

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2), "utf-8");
        return NextResponse.json([]);
      }

      const fileContent = fs.readFileSync(filePath, "utf-8");
      const reviews = JSON.parse(fileContent);
      
      const filtered = reviews.filter(
        (rev) => !["review-1", "review-2", "review-3"].includes(rev.id)
      );

      // Sort desc
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return NextResponse.json(filtered);
    }
  } catch (error) {
    console.error("GET Reviews API Error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, rating, comment } = data;

    if (!name || !rating || !comment) {
      return NextResponse.json({ error: "Missing name, rating, or comment." }, { status: 400 });
    }

    const newReview = {
      id: `review-${Date.now()}`,
      name,
      rating: parseInt(rating),
      comment,
      createdAt: new Date().toISOString()
    };

    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;

    if (endpoint && key) {
      const client = new CosmosClient({ endpoint, key });
      const { database } = await client.databases.createIfNotExists({ id: databaseId });
      const { container } = await database.containers.createIfNotExists({
        id: containerId,
        partitionKey: { paths: ["/id"] },
      });

      await container.items.create(newReview);

      return NextResponse.json({ success: true, review: newReview, storage: "Azure Cosmos DB" });
    } else {
      // Local fallback
      const dataDir = path.join(process.cwd(), "data");
      const filePath = path.join(dataDir, "reviews.json");

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
      }

      let reviews = [];
      if (fs.existsSync(filePath)) {
        try {
          reviews = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        } catch (err) {
          console.error(err);
        }
      }

      reviews.unshift(newReview);
      fs.writeFileSync(filePath, JSON.stringify(reviews, null, 2), "utf-8");

      return NextResponse.json({ success: true, review: newReview, storage: "Local JSON File Fallback" });
    }
  } catch (error) {
    console.error("POST Review API Error:", error);
    return NextResponse.json({ error: "Server error logging review: " + error.message }, { status: 500 });
  }
}
