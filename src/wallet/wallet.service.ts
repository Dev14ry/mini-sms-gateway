import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: {
        id: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async deductCredits(userId: string, credits: unknown) {
    if (
      typeof credits !== 'number' ||
      !Number.isSafeInteger(credits) ||
      credits <= 0
    ) {
      throw new BadRequestException('Credits must be a positive integer');
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: {
          id: true,
          balance: true,
        },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Update only when the wallet has enough credits.
      // This condition prevents concurrent requests from
      // deducting more credits than the wallet contains.
      const updateResult = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          balance: { gte: credits },
        },
        data: {
          balance: { decrement: credits },
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const updatedWallet = await tx.wallet.findUniqueOrThrow({
        where: { id: wallet.id },
        select: {
          id: true,
          balance: true,
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount: credits,
          balanceBefore: wallet.balance,
          balanceAfter: updatedWallet.balance,
          description: 'Wallet credit deduction',
        },
      });

      return {
        message: 'Credits deducted successfully',
        wallet: updatedWallet,
        transaction,
      };
    });
  }
}
