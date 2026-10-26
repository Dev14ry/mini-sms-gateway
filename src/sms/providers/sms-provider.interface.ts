export interface SmsProviderResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

export interface SmsProvider {
  readonly name: string;
  readonly priority: number;

  getBalance(): number;

  send(
    to: string[],
    message: string,
    creditsPerRecipient?: number,
  ): Promise<SmsProviderResult>;
}
