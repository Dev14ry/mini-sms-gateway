-- CreateTable
CREATE TABLE "SmsProviderAttempt" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsProviderAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsProviderAttempt_provider_createdAt_idx" ON "SmsProviderAttempt"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "SmsProviderAttempt_requestId_idx" ON "SmsProviderAttempt"("requestId");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");
