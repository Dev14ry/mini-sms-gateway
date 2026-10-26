import { Injectable } from '@nestjs/common';
import { MockSmsProvider } from './mock-sms-provider';
import { SmsProvider } from './sms-provider.interface';

function getNumberFromEnv(key: string, fallback: number): number {
  const value = process.env[key];

  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${key} must be a valid number`);
  }

  return parsed;
}

@Injectable()
export class SmsProviderRegistry {
  private readonly providers: SmsProvider[];

  constructor() {
    this.providers = [
      new MockSmsProvider({
        name: 'ROUTE_A',
        priority: 1,
        initialBalance: getNumberFromEnv('ROUTE_A_BALANCE', 10000),
        failureRate: getNumberFromEnv('ROUTE_A_FAILURE_RATE', 0.3),
      }),
      new MockSmsProvider({
        name: 'ROUTE_B',
        priority: 2,
        initialBalance: getNumberFromEnv('ROUTE_B_BALANCE', 10000),
        failureRate: getNumberFromEnv('ROUTE_B_FAILURE_RATE', 0.1),
      }),
    ].sort((a, b) => a.priority - b.priority);
  }

  getProviders(): SmsProvider[] {
    return [...this.providers];
  }

  getProviderBalances() {
    return this.providers.map((provider) => ({
      name: provider.name,
      priority: provider.priority,
      balance: provider.getBalance(),
    }));
  }
}
