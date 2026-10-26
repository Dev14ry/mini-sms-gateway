import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development credits cannot be added in production.');
  }

  if (process.env.ALLOW_DEV_CREDIT !== 'true') {
    throw new Error(
      'Set ALLOW_DEV_CREDIT=true to confirm a development credit operation.',
    );
  }

  const email = process.argv[2]?.trim().toLowerCase();
  const amountInput = process.argv[3];

  if (!email || !amountInput) {
    throw new Error(
      'Usage: ts-node scripts/add-dev-credits.ts <email> <credits>',
    );
  }

  const amount = Number(amountInput);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('Credits must be a positive safe integer.');
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured in .env');
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

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: user.id },
        create: { userId: user.id, balance: 0 },
        update: {},
        select: { id: true, balance: true },
      });

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
        select: { id: true, balance: true },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount,
          balanceBefore: wallet.balance,
          balanceAfter: updatedWallet.balance,
          description: 'Development test credits',
        },
      });

      return updatedWallet;
    });

    console.log('Development credits added successfully.');
    console.log(`User: ${user.email}`);
    console.log(`Credits added: ${amount}`);
    console.log(`New wallet balance: ${result.balance}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
