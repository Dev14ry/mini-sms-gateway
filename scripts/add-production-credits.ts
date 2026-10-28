import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

async function main() {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('NODE_ENV must be set to production.');
  }

  if (process.env.ALLOW_PRODUCTION_CREDIT !== 'true') {
    throw new Error(
      'Set ALLOW_PRODUCTION_CREDIT=true to authorize this operation.',
    );
  }

  const email = process.argv[2]?.trim().toLowerCase();
  const amountInput = process.argv[3];
  const confirmation = process.argv[4];

  if (!email || !amountInput || confirmation !== '--confirm-production') {
    throw new Error(
      'Usage: npx tsx scripts/add-production-credits.ts <email> <credits> --confirm-production',
    );
  }

  const amount = Number(amountInput);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('Credits must be a positive safe integer.');
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  let databaseHost: string;

  try {
    databaseHost = new URL(connectionString).hostname;
  } catch {
    throw new Error('DATABASE_URL is invalid.');
  }

  if (!databaseHost.endsWith('.neon.tech')) {
    throw new Error(
      'Safety check failed: DATABASE_URL must point to a Neon database.',
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new Error(`No registered user found for ${email}`);
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.upsert({
          where: { userId: user.id },
          create: { userId: user.id, balance: 0 },
          update: {},
          select: { id: true, balance: true },
        });

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: amount } },
          select: { balance: true },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            amount,
            balanceBefore: wallet.balance,
            balanceAfter: updatedWallet.balance,
            description: 'Authorized production credit adjustment',
          },
        });

        return {
          balanceBefore: wallet.balance,
          balanceAfter: updatedWallet.balance,
        };
      },
      { isolationLevel: 'Serializable' },
    );

    console.log('Production credits added successfully.');
    console.log(`User: ${user.email}`);
    console.log(`Credits added: ${amount}`);
    console.log(`Previous balance: ${result.balanceBefore}`);
    console.log(`New balance: ${result.balanceAfter}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Credit operation failed.',
  );
  process.exitCode = 1;
});
