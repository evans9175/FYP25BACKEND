// User-related utility functions
const { get } = require("http");
const prisma = require("./prisma");

async function createUser(email, name) {
  return await prisma.user.create({
    data: { email, name },
  });
}

async function getUserByEmail(email) {
  return await prisma.user.findUnique({
    where: { email },
  });
}

async function getAllUsers() {
  return await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });
}

module.exports = {
  createUser,
  getUserByEmail,
  getAllUsers,
};
