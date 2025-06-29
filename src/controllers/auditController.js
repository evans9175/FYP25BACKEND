const solanaService = require("../services/solanaService");

class AuditController {
  async submitAudit(req, res) {
    try {
      const { companyPubkey, hash, metadata, auditType, requiresApproval } =
        req.body;

      // Validate required fields
      if (!companyPubkey || !hash || !metadata) {
        return res.status(400).json({
          error: "Missing required fields: companyPubkey, hash, metadata",
        });
      }

      // Validate hash format (should be 32 bytes)
      if (!Array.isArray(hash) || hash.length !== 32) {
        return res.status(400).json({
          error: "Hash must be an array of 32 bytes",
        });
      }

      const result = await solanaService.submitAudit({
        companyPubkey,
        hash,
        metadata,
        auditType: auditType || { internal: {} },
        requiresApproval: requiresApproval || false,
      });

      res.json(result);
    } catch (error) {
      console.error("Submit audit error:", error);
      res.status(500).json({
        error: "Failed to submit audit",
        details: error.message,
      });
    }
  }

  async getAudit(req, res) {
    try {
      const { auditPubkey } = req.params;

      if (!auditPubkey) {
        return res.status(400).json({ error: "Audit public key is required" });
      }

      const audit = await solanaService.getAudit(auditPubkey);
      res.json({ success: true, audit });
    } catch (error) {
      console.error("Get audit error:", error);
      res.status(500).json({
        error: "Failed to fetch audit",
        details: error.message,
      });
    }
  }

  async getAllAudits(req, res) {
    try {
      const audits = await solanaService.getAllAudits();
      res.json({ success: true, audits, count: audits.length });
    } catch (error) {
      console.error("Get all audits error:", error);
      res.status(500).json({
        error: "Failed to fetch audits",
        details: error.message,
      });
    }
  }

  async approveAudit(req, res) {
    try {
      const { auditPubkey } = req.params;
      const { approverPubkey } = req.body;

      if (!auditPubkey || !approverPubkey) {
        return res.status(400).json({
          error: "Both audit and approver public keys are required",
        });
      }

      const result = await solanaService.approveAudit(
        auditPubkey,
        approverPubkey
      );
      res.json(result);
    } catch (error) {
      console.error("Approve audit error:", error);
      res.status(500).json({
        error: "Failed to approve audit",
        details: error.message,
      });
    }
  }

  // Health check for testing
  async healthCheck(req, res) {
    try {
      const walletBalance =
        await solanaService.program.provider.connection.getBalance(
          solanaService.wallet.publicKey
        );

      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        wallet: solanaService.wallet.publicKey.toString(),
        balance: walletBalance / 1e9, // Convert lamports to SOL
        network: process.env.SOLANA_RPC_URL,
      });
    } catch (error) {
      res.status(500).json({
        status: "ERROR",
        error: error.message,
      });
    }
  }
}

module.exports = new AuditController();
