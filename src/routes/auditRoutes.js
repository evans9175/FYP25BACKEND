const express = require("express");
const router = express.Router();

// Temporary simple controllers until we fix the main issue
const tempController = {
  healthCheck: (req, res) => {
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      service: "audit-api",
    });
  },

  submitAudit: (req, res) => {
    res.json({
      message: "Submit audit endpoint",
      received: req.body,
    });
  },

  getAllAudits: (req, res) => {
    res.json({
      message: "Get all audits",
      audits: [],
    });
  },

  getAudit: (req, res) => {
    res.json({
      message: "Get single audit",
      auditPubkey: req.params.auditPubkey,
    });
  },

  approveAudit: (req, res) => {
    res.json({
      message: "Approve audit",
      auditPubkey: req.params.auditPubkey,
    });
  },
};

// IMPORTANT: Specific routes MUST come before parameterized routes
router.get("/health", tempController.healthCheck);
router.post("/submit", tempController.submitAudit);
router.get("/all", tempController.getAllAudits);

// Parameterized routes come last
router.get("/:auditPubkey", tempController.getAudit);
router.post("/:auditPubkey/approve", tempController.approveAudit);

module.exports = router;
