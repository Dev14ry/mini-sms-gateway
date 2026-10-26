import { SmsProvider, SmsProviderResult } from './sms-provider.interface';

export interface MockSmsProviderConfig {
  name: string;
  priority: number;
  initialBalance: number;
  failureRate: number;
}

export class MockSmsProvider implements SmsProvider {
  readonly name: string;
  readonly priority: number;

  private balance: number;
  private readonly failureRate: number;

  constructor(config: MockSmsProviderConfig) {
    if (
      !Number.isSafeInteger(config.initialBalance) ||
      config.initialBalance < 0
    ) {
      throw new Error('Provider balance must be a non-negative integer');
    }

    if (
      !Number.isFinite(config.failureRate) ||
      config.failureRate < 0 ||
      config.failureRate > 1
    ) {
      throw new Error('Failure rate must be between 0 and 1');
    }

    this.name = config.name;
    this.priority = config.priority;
    this.balance = config.initialBalance;
    this.failureRate = config.failureRate;
  }

  getBalance(): number {
    return this.balance;
  }

  async send(
    to: string[],
    message: string,
    creditsPerRecipient = 1,
  ): Promise<SmsProviderResult> {
    if (to.length === 0 || !message.trim()) {
      return {
        success: false,
        provider: this.name,
        error: 'Recipients and message are required',
      };
    }

    if (
      !Number.isSafeInteger(creditsPerRecipient) ||
      creditsPerRecipient <= 0
    ) {
      return {
        success: false,
        provider: this.name,
        error: 'Invalid SMS credit cost',
      };
    }

    const requiredCredits = to.length * creditsPerRecipient;

    if (
      !Number.isSafeInteger(requiredCredits) ||
      this.balance < requiredCredits
    ) {
      return {
        success: false,
        provider: this.name,
        error: 'Insufficient provider balance',
      };
    }

    if (Math.random() < this.failureRate) {
      return {
        success: false,
        provider: this.name,
        error: 'Mock provider delivery failure',
      };
    }

    this.balance -= requiredCredits;

    return {
      success: true,
      provider: this.name,
      messageId: `${this.name}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    };
  }
}
