import express from "express";
import serverless from "serverless-http";
import { registerServerlessRoutes } from "../../server/routes-serverless";

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Initialize services
let isInitialized = false;

async function initializeServer() {
  if (!isInitialized) {
    // Register all routes
    registerServerlessRoutes(app);

    console.log("✅ Serverless API initialized");
    isInitialized = true;
  }
}

// Initialize once on cold start
initializeServer();

// Serverless handler
export const handler = async (event: any, context: any) => {
  try {
    console.log("🚀 Serverless function invoked:", event.path);

    // Ensure initialization is complete
    await initializeServer();

    // Create serverless handler
    const serverlessHandler = serverless(app);
    const result: any = await serverlessHandler(event, context);

    console.log("✅ Response status:", result?.statusCode);
    return result;
  } catch (error: any) {
    console.error("❌ Serverless function error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Internal server error",
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
};
