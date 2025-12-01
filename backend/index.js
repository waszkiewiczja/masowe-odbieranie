// backend/index.js
import express from "express";
import cors from "cors";
import emailRoutes from "./routes/emailRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import replyRoutes from "./routes/replyRoutes.js";

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Enable JSON parsing for request bodies
app.use(express.json());

app.use("/api/emails", emailRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/reply", replyRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
