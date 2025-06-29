require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Use simple test routes instead
const testRoutes = require("./routes/testRoutes");
app.use("/api", testRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({ message: "Server working!" });
});

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
