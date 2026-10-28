import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsProviderRegistry } from './providers/sms-provider.registery';

@Controller('routes')
export class RoutesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: SmsProviderRegistry,
  ) {}

  @Get('health')
  async getHealth() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Read actual provider attempts from the last 24 hours.
    const attempts = await this.prisma.smsProviderAttempt.groupBy({
      by: ['provider', 'success'],
      where: {
        createdAt: { gte: since },
      },
      _count: {
        _all: true,
      },
    });

    const balances = this.providers.getProviderBalances();

    const routes = balances.map((route) => {
      const sent =
        attempts.find(
          (attempt) =>
            attempt.provider === route.name && attempt.success === true,
        )?._count._all ?? 0;

      const failed =
        attempts.find(
          (attempt) =>
            attempt.provider === route.name && attempt.success === false,
        )?._count._all ?? 0;

      const total = sent + failed;

      const successRate =
        total > 0 ? Number(((sent / total) * 100).toFixed(2)) : null;

      return {
        name: route.name,
        priority: route.priority,
        balance: route.balance,
        sent,
        failed,
        total,
        successRate,
        healthPercentage: successRate,
        status:
          total === 0
            ? 'NO_DATA'
            : successRate !== null && successRate >= 80
              ? 'HEALTHY'
              : 'DEGRADED',
      };
    });

    return {
      window: '24 hours',
      formula: 'healthPercentage = successfulAttempts / totalAttempts * 100',
      routes,
    };
  }
}
