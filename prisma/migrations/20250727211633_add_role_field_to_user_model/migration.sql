-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'QA', 'AUDITOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'ADMIN';
