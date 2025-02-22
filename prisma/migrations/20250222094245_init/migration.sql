/*
  Warnings:

  - Added the required column `provider` to the `Account` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "binaryIndex" JSONB,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nextDeltaToken" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "New" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "New_pkey" PRIMARY KEY ("id")
);
