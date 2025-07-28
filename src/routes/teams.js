const express = require("express");
const { createTeam } = require("../utils/entityUtils");
const prisma = require("../utils/prisma");

const router = express.Router();

// Create a new team
router.post("/", async (req, res) => {
  try {
    const team = await createTeam(req.body);
    res.status(201).json(team);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a team
router.put("/:id", async (req, res) => {
  try {
    const team = await prisma.team.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(team);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a team
router.delete("/:id", async (req, res) => {
  try {
    await prisma.team.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all teams
router.get("/", async (req, res) => {
  try {
    const teams = await prisma.team.findMany();
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific team by ID
router.get("/:id", async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!team) return res.status(404).json({ error: "Team not found" });
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
