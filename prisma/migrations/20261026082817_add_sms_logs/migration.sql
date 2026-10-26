-- CreateEnum
CREATE TYPE "SmsEncoding" AS ENUM ('GSM_7', 'UNICODE');

-- CreateEnum
CREATE TYPE "SmsLogStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "encoding" "SmsEncoding" NOT NULL,
    "parts" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "status" "SmsLogStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsLog_userId_createdAt_idx" ON "SmsLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SmsLog_userId_status_createdAt_idx" ON "SmsLog"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SmsLog_recipient_createdAt_idx" ON "SmsLog"("recipient", "createdAt");

-- CreateIndex
CREATE INDEX "SmsLog_requestId_idx" ON "SmsLog"("requestId");

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
