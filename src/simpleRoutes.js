const express = require("express");
const router = express.Router();

// Health check - specific route first
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "audit-api",
    timestamp: new Date().toISOString(),
  });
});

// Submit audit
router.post("/submit", (req, res) => {
  res.json({
    message: "Submit endpoint working",
    received: req.body,
  });
});

// Get all audits
router.get("/all", (req, res) => {
  res.json({
    message: "Get all audits endpoint",
    audits: [],
  });
});

// Get single audit - parameterized route last
router.get("/audit/:id", (req, res) => {
  res.json({
    message: "Get single audit",
    id: req.params.id,
  });
});

module.exports = router;
