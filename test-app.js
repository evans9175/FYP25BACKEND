require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple test routes
app.get("/", (req, res) => {
  res.json({ message: "Test server working!" });
});

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
});

module.exports = app;
