import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SmsProviderRegistry } from './providers/sms-provider.registery';
import { calculateSms } from './utils/sms-calculator';
import { normalizeNepaliPhoneNumber } from './utils/phone-number';

const SMS_STATUSES = ['PENDING', 'SENT', 'FAILED'] as const;

type SmsStatus = (typeof SMS_STATUSES)[number];

interface SendSmsInput {
  to?: unknown;
  message?: unknown;
}

interface SmsLogQuery {
  page?: string;
  limit?: string;
  status?: string;
  number?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class SmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: SmsProviderRegistry,
  ) {}

  calculate(message: unknown) {
    if (typeof message !== 'string') {
      throw new BadRequestException('Message must be a string');
    }

    try {
      return calculateSms(message);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }

      throw new BadRequestException('Unable to calculate SMS cost');
    }
  }

  async send(userId: string, input: SendSmsInput) {
    if (!Array.isArray(input?.to) || input.to.length < 1) {
      throw new BadRequestException('At least one recipient is required');
    }

    if (input.to.length > 100) {
      throw new BadRequestException(
        'A maximum of 100 recipients is allowed per request',
      );
    }

    if (!input.to.every((number) => typeof number === 'string')) {
      throw new BadRequestException(
        'Every recipient phone number must be a string',
      );
    }

    if (typeof input.message !== 'string' || input.message.length > 10000) {
      throw new BadRequestException(
        'Message must be a string with at most 10000 characters',
      );
    }

    const message = input.message;

    let recipients: string[];

    try {
      recipients = input.to.map((number) =>
        normalizeNepaliPhoneNumber(number as string),
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }

      throw new BadRequestException('Invalid recipient phone number');
    }

    const calculation = this.calculate(message);
    const creditsPerRecipient = calculation.totalCredits;
    const totalCredits = creditsPerRecipient * recipients.length;

    if (!Number.isSafeInteger(totalCredits) || totalCredits <= 0) {
      throw new BadRequestException('Invalid SMS credit calculation');
    }

    const requestId = randomUUID();
    const encoding = calculation.encoding === 'GSM-7' ? 'GSM_7' : 'UNICODE';

    // Deduct credits and create SMS logs atomically.
    const debit = await this.prisma.$transaction(async (tx) => {
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

      const updateResult = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          balance: { gte: totalCredits },
        },
        data: {
          balance: { decrement: totalCredits },
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

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount: totalCredits,
          balanceBefore: updatedWallet.balance + totalCredits,
          balanceAfter: updatedWallet.balance,
          description: `SMS request ${requestId}: ${recipients.length} recipient(s)`,
        },
      });

      await tx.smsLog.createMany({
        data: recipients.map((recipient) => ({
          requestId,
          userId,
          recipient,
          message,
          encoding,
          parts: calculation.parts,
          credits: creditsPerRecipient,
          status: 'PENDING' as const,
        })),
      });

      return {
        walletBalance: updatedWallet.balance,
      };
    });

    const attempts: string[] = [];

    // Providers are ordered by priority in the registry.
    for (const provider of this.providers.getProviders()) {
      let result: Awaited<ReturnType<typeof provider.send>> | undefined;
      let providerError: string | undefined;

      // Catch provider errors separately so a database error while saving
      // an attempt is not mistaken for a provider delivery failure.
      try {
        result = await provider.send(recipients, message, creditsPerRecipient);
      } catch (error: unknown) {
        providerError =
          error instanceof Error ? error.message : 'Provider error';
      }

      // Record thrown provider errors.
      if (providerError !== undefined) {
        await this.prisma.smsProviderAttempt.create({
          data: {
            requestId,
            provider: provider.name,
            success: false,
            error: providerError,
          },
        });

        attempts.push(`${provider.name}: ${providerError}`);
        continue;
      }

      // Record unsuccessful provider responses.
      if (!result || !result.success) {
        const errorMessage = result?.error ?? 'Sending failed';

        await this.prisma.smsProviderAttempt.create({
          data: {
            requestId,
            provider: provider.name,
            success: false,
            error: errorMessage,
          },
        });

        attempts.push(`${provider.name}: ${errorMessage}`);
        continue;
      }

      // Record successful provider delivery.
      await this.prisma.smsProviderAttempt.create({
        data: {
          requestId,
          provider: provider.name,
          success: true,
          error: null,
        },
      });

      await this.prisma.smsLog.updateMany({
        where: {
          requestId,
          userId,
          status: 'PENDING',
        },
        data: {
          status: 'SENT',
          provider: provider.name,
          providerMessageId: result.messageId,
          error: null,
        },
      });

      return {
        requestId,
        status: 'SENT',
        provider: provider.name,
        recipients,
        partsPerRecipient: calculation.parts,
        creditsCharged: totalCredits,
        walletBalance: debit.walletBalance,
      };
    }

    const failureMessage = attempts.join('; ') || 'All SMS providers failed';

    // All providers failed. Refund credits and mark logs FAILED atomically.
    const refundedBalance = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found during refund');
      }

      const refundedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: totalCredits },
        },
        select: {
          balance: true,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'REFUND',
          amount: totalCredits,
          balanceBefore: refundedWallet.balance - totalCredits,
          balanceAfter: refundedWallet.balance,
          description: `SMS request ${requestId} failed; credits refunded`,
        },
      });

      await tx.smsLog.updateMany({
        where: {
          requestId,
          userId,
          status: 'PENDING',
        },
        data: {
          status: 'FAILED',
          error: failureMessage,
        },
      });

      return refundedWallet.balance;
    });

    return {
      requestId,
      status: 'FAILED',
      recipients,
      creditsRefunded: totalCredits,
      walletBalance: refundedBalance,
      error: 'All SMS providers failed',
      details: attempts,
    };
  }

  async getLogs(userId: string, query: SmsLogQuery) {
    const page = this.parsePositiveInteger(query.page, 1, 'page');
    const limit = this.parsePositiveInteger(query.limit, 20, 'limit');

    if (limit > 100) {
      throw new BadRequestException('Limit cannot exceed 100');
    }

    let status: SmsStatus | undefined;

    if (query.status) {
      const normalizedStatus = query.status.toUpperCase();

      if (!SMS_STATUSES.includes(normalizedStatus as SmsStatus)) {
        throw new BadRequestException(
          'Status must be PENDING, SENT, or FAILED',
        );
      }

      status = normalizedStatus as SmsStatus;
    }

    const from = this.parseDate(query.from, 'from');
    const to = this.parseDate(query.to, 'to');

    if (from && to && from > to) {
      throw new BadRequestException(
        'The from date must be earlier than or equal to the to date',
      );
    }

    const number = query.number?.trim();

    const where: {
      userId: string;
      status?: SmsStatus;
      recipient?: { contains: string };
      createdAt?: { gte?: Date; lte?: Date };
    } = { userId };

    if (status) {
      where.status = status;
    }

    if (number) {
      where.recipient = { contains: number };
    }

    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.smsLog.count({ where }),
      this.prisma.smsLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          requestId: true,
          recipient: true,
          message: true,
          encoding: true,
          parts: true,
          credits: true,
          status: true,
          provider: true,
          providerMessageId: true,
          error: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private parsePositiveInteger(
    value: string | undefined,
    fallback: number,
    field: string,
  ): number {
    if (value === undefined || value === '') {
      return fallback;
    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }

    return parsed;
  }

  private parseDate(
    value: string | undefined,
    field: string,
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }

    return date;
  }
}
