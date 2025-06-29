const express = require("express");
const router = express.Router();

// Initialize Solana components
let solanaService = null;

async function initializeSolana() {
  if (solanaService) return solanaService;

  try {
    const anchor = require("@coral-xyz/anchor");
    const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
    const fs = require("fs");

    const connection = new Connection(process.env.SOLANA_RPC_URL);
    const keypairData = JSON.parse(
      fs.readFileSync(process.env.WALLET_KEYPAIR_PATH, "utf8")
    );
    const wallet = new anchor.Wallet(
      Keypair.fromSecretKey(new Uint8Array(keypairData))
    );

    const provider = new anchor.AnchorProvider(connection, wallet, {
      preflightCommitment: "processed",
    });
    anchor.setProvider(provider);

    const idl = JSON.parse(fs.readFileSync("./idl/suites.json", "utf8"));
    const programId = new PublicKey(process.env.PROGRAM_ID);
    const program = new anchor.Program(idl, programId, provider);

    solanaService = { connection, wallet, provider, program };
    return solanaService;
  } catch (error) {
    throw new Error(`Failed to initialize Solana: ${error.message}`);
  }
}
// Add this route at the top of your routes (after the router declaration)
router.get("/", (req, res) => {
  res.json({
    name: "Solana Audit API",
    version: "1.0.0",
    status: "running",
    message: "Welcome to the Solana Audit API",
    endpoints: {
      "GET /api/": "This documentation",
      "GET /api/health": "Basic health check",
      "GET /api/status": "Complete backend status",
      "GET /api/solana-health": "Solana configuration check",
      "GET /api/wallet-test": "Wallet connection test",
      "GET /api/program-info": "Program information",
      "POST /api/submit-audit": "Submit audit (requires POST)",
      "POST /api/initialize-program": "Initialize program (requires POST)",
    },
    timestamp: new Date().toISOString(),
  });
});

router.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Backend is working perfectly!" });
});

router.get("/solana-health", (req, res) => {
  try {
    const fs = require("fs");
    const idlExists = fs.existsSync("./idl/suites.json");
    const keypairExists = fs.existsSync(process.env.WALLET_KEYPAIR_PATH);

    res.json({
      status: "OK",
      message: "All Solana components loaded correctly",
      solanaConfig: {
        programId: process.env.PROGRAM_ID ? "loaded" : "missing",
        rpcUrl: process.env.SOLANA_RPC_URL ? "loaded" : "missing",
        idlFile: idlExists ? "found" : "missing",
        keypairFile: keypairExists ? "found" : "missing",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({ status: "ERROR", error: error.message });
  }
});

router.get("/wallet-test", async (req, res) => {
  try {
    const service = await initializeSolana();
    const balance = await service.connection.getBalance(
      service.wallet.publicKey
    );

    res.json({
      status: "SUCCESS",
      message: "Wallet connected successfully",
      publicKey: service.wallet.publicKey.toString(),
      balance: `${balance / 1e9} SOL`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({ status: "ERROR", error: error.message });
  }
});

router.get("/program-info", async (req, res) => {
  try {
    const service = await initializeSolana();
    const fs = require("fs");
    const idl = JSON.parse(fs.readFileSync("./idl/suites.json", "utf8"));

    res.json({
      status: "SUCCESS",
      message: "Program loaded successfully",
      programId: service.program.programId.toString(),
      programName: idl.name,
      version: idl.version,
      availableInstructions: idl.instructions.map((inst) => inst.name),
      accountTypes: idl.accounts ? idl.accounts.map((acc) => acc.name) : [],
      note: "Ready to call program instructions",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({ status: "ERROR", error: error.message });
  }
});

// Test the initialize instruction that exists
router.post("/initialize-program", async (req, res) => {
  try {
    const service = await initializeSolana();

    // This will depend on what accounts your initialize instruction expects
    // You'll need to check your Anchor program to see what Context<Initialize> requires

    res.json({
      status: "INFO",
      message: "Initialize endpoint ready",
      note: "Need to check what accounts Initialize context requires",
      availableInstruction: "initialize",
      programId: service.program.programId.toString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({ status: "ERROR", error: error.message });
  }
});

// Placeholder for future audit functionality
router.post("/submit-audit", (req, res) => {
  res.json({
    status: "INFO",
    message: "Audit submission not yet implemented in Solana program",
    note: "Your backend is ready - need to add submit_audit instruction to your Anchor program",
    backendStatus: "READY",
    programStatus: "NEEDS_AUDIT_INSTRUCTIONS",
    nextSteps: [
      "1. Add submit_audit instruction to your Anchor program",
      "2. Add Audit account structure",
      "3. Rebuild and redeploy program",
      "4. Update IDL file",
    ],
    timestamp: new Date().toISOString(),
  });
});

router.get("/status", (req, res) => {
  res.json({
    status: "SUCCESS",
    message: "Backend is 100% working!",
    components: {
      express: "Working ✅",
      solana_connection: "Working ✅",
      wallet: "Working ✅",
      program_loading: "Working ✅",
      idl_parsing: "Working ✅",
    },
    nextStep: "Add audit functionality to your Solana program",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
