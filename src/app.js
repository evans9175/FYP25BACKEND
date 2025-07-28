// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Your existing test routes
const testRoutes = require("./routes/testRoutes");
app.use("/api", testRoutes);

// Add new routes gradually (uncomment as you create them)
const userRoutes = require("./routes/users");
const organizationRoutes = require("./routes/organizations");
const authrouteRoutes = require("./routes/authroute");

app.use("/api/users", userRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/authroute", authrouteRoutes);

// Your existing endpoints
app.get("/", (req, res) => {
  res.json({ message: "Hello, World!" });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// 404 handler for unknown routes
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Global error:", error);

  res.status(error.status || 500).json({
    error: error.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
