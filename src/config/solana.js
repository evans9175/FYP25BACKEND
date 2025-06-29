const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

class SolanaConfig {
  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
    );
    this.wallet = this.loadWallet();
    this.provider = new anchor.AnchorProvider(this.connection, this.wallet, {
      preflightCommitment: "processed",
    });
    anchor.setProvider(this.provider);
    this.program = this.loadProgram();
  }

  loadWallet() {
    try {
      const keypairPath =
        process.env.WALLET_KEYPAIR_PATH || "./keys/keypair.json";
      const keypairFile = fs.readFileSync(path.resolve(keypairPath), "utf8");
      const keypairData = JSON.parse(keypairFile);
      return new anchor.Wallet(
        Keypair.fromSecretKey(new Uint8Array(keypairData))
      );
    } catch (error) {
      console.error("Error loading wallet:", error);
      throw new Error("Failed to load wallet keypair");
    }
  }

  loadProgram() {
    try {
      const idlPath = path.resolve("./idl/suites.json");
      const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
      const programId = new anchor.web3.PublicKey(process.env.PROGRAM_ID);
      return new anchor.Program(idl, programId, this.provider);
    } catch (error) {
      console.error("Error loading program:", error);
      throw new Error("Failed to load program");
    }
  }
}

module.exports = new SolanaConfig();
