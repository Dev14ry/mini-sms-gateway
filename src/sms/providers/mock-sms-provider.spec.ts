import { MockSmsProvider } from './mock-sms-provider';

describe('MockSmsProvider', () => {
  it('should return the initial provider balance', () => {
    const provider = new MockSmsProvider({
      name: 'ROUTE_A',
      priority: 1,
      initialBalance: 100,
      failureRate: 0,
    });

    expect(provider.getBalance()).toBe(100);
  });

  it('should reduce balance after successful sending', async () => {
    const provider = new MockSmsProvider({
      name: 'ROUTE_A',
      priority: 1,
      initialBalance: 100,
      failureRate: 0,
    });

    const result = await provider.send(['+9779841234567'], 'Hello');

    expect(result.success).toBe(true);
    expect(provider.getBalance()).toBe(99);
  });

  it('should not reduce balance when sending fails', async () => {
    const provider = new MockSmsProvider({
      name: 'ROUTE_A',
      priority: 1,
      initialBalance: 100,
      failureRate: 1,
    });

    const result = await provider.send(['+9779841234567'], 'Hello');

    expect(result.success).toBe(false);
    expect(provider.getBalance()).toBe(100);
  });

  it('should reject an invalid failure rate', () => {
    expect(
      () =>
        new MockSmsProvider({
          name: 'ROUTE_A',
          priority: 1,
          initialBalance: 100,
          failureRate: 1.5,
        }),
    ).toThrow('Failure rate must be between 0 and 1');
  });

  it('should reject insufficient provider balance', async () => {
    const provider = new MockSmsProvider({
      name: 'ROUTE_A',
      priority: 1,
      initialBalance: 0,
      failureRate: 0,
    });

    const result = await provider.send(['+9779841234567'], 'Hello');

    expect(result.success).toBe(false);
    expect(provider.getBalance()).toBe(0);
  });
});
