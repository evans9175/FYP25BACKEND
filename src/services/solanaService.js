const { Keypair, PublicKey } = require("@solana/web3.js");
const anchor = require("@coral-xyz/anchor");
const solanaConfig = require("../config/solana");

class SolanaService {
  constructor() {
    this.program = solanaConfig.program;
    this.wallet = solanaConfig.wallet;
  }

  async submitAudit(auditData) {
    try {
      const { companyPubkey, hash, metadata, auditType, requiresApproval } =
        auditData;

      // Generate new audit account
      const audit = Keypair.generate();
      const company = new PublicKey(companyPubkey);

      const tx = await this.program.methods
        .submitAudit(
          Array.from(hash), // Convert hash to array if needed
          metadata,
          auditType,
          requiresApproval
        )
        .accounts({
          company,
          audit: audit.publicKey,
          authority: this.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([audit])
        .rpc();

      return {
        success: true,
        transactionId: tx,
        auditPubkey: audit.publicKey.toString(),
      };
    } catch (error) {
      console.error("Error submitting audit:", error);
      throw error;
    }
  }

  async getAudit(auditPubkey) {
    try {
      const auditAccount = await this.program.account.audit.fetch(
        new PublicKey(auditPubkey)
      );
      return auditAccount;
    } catch (error) {
      console.error("Error fetching audit:", error);
      throw error;
    }
  }

  async approveAudit(auditPubkey, approverPubkey) {
    try {
      const audit = new PublicKey(auditPubkey);
      const approver = new PublicKey(approverPubkey);

      const tx = await this.program.methods
        .approveAudit()
        .accounts({
          audit,
          approver,
        })
        .rpc();

      return {
        success: true,
        transactionId: tx,
      };
    } catch (error) {
      console.error("Error approving audit:", error);
      throw error;
    }
  }

  async getAllAudits() {
    try {
      const audits = await this.program.account.audit.all();
      return audits.map((audit) => ({
        pubkey: audit.publicKey.toString(),
        data: audit.account,
      }));
    } catch (error) {
      console.error("Error fetching all audits:", error);
      throw error;
    }
  }
}

module.exports = new SolanaService();
