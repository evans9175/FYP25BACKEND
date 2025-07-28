// Utility functions for creating users, organizations, and teams
const prisma = require("./prisma");

// Create a new user
async function createUser({
  email,
  name,
  role = "ADMIN",
  organizationId = null,
  teamId = null,
}) {
  return await prisma.user.create({
    data: {
      email,
      name,
      role,
      organizationId,
      teamId,
    },
  });
}

// Create a new organization
async function createOrganization({ name, registeredById }) {
  return await prisma.organization.create({
    data: {
      name,
      registeredById,
    },
  });
}

// Create a new team
async function createTeam({ name, organizationId }) {
  return await prisma.team.create({
    data: {
      name,
      organizationId,
    },
  });
}

module.exports = {
  createUser,
  createOrganization,
  createTeam,
};
