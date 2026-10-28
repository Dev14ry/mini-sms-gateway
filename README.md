# Mini SMS Gateway

A backend SMS gateway built with NestJS, TypeScript, PostgreSQL, and Prisma. It provides JWT authentication, prepaid wallet credits, SMS cost calculation, mock SMS providers, automatic provider failover, delivery logs, and provider health metrics.

## Features

- **Authentication:** User registration and login using JWT.
- **Wallet management:** Prepaid credits with transaction history.
- **SMS validation:** Validates recipient numbers and normalizes Nepali mobile numbers.
- **SMS cost calculation:** Calculates message encoding, SMS parts, and required credits.
- **Mock SMS providers:** Supports multiple providers with configurable priorities, balances, and failure rates.
- **Provider failover:** Automatically tries the next provider when a provider fails.
- **Atomic wallet deduction:** Prevents concurrent requests from spending more credits than the available balance.
- **Automatic refunds:** Refunds credits when all SMS providers fail.
- **SMS logs:** Paginated logs with status, date, and recipient filters.
- **Provider health:** Reports provider balances and delivery success rates over the previous 24 hours.
- **Automated tests:** Unit tests and end-to-end test support.

## Tech Stack

- Node.js
- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT authentication
- Jest

## Prerequisites

Install the following before running the project:

- Node.js compatible with the project configuration
- npm
- PostgreSQL

## Getting Started

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd mini-sms-gateway
```

Replace the repository URL with your actual GitHub repository URL.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root.

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mini_sms_gateway?schema=public"

JWT_SECRET="replace-with-a-secure-random-secret"
JWT_EXPIRES_IN="1h"

ROUTE_A_FAILURE_RATE=0.3
ROUTE_B_FAILURE_RATE=0.1

# Development only
ALLOW_DEV_CREDIT=false
```

Update the database credentials to match your PostgreSQL configuration.

Provider failure rates are probabilities between `0` and `1`. For example, `0.3` represents a 30% simulated failure rate.

Keep `.env` out of version control. Never commit real database credentials or JWT secrets.

### 4. Set up the database

Create the PostgreSQL database configured in `DATABASE_URL`, then run:

```bash
npx prisma migrate dev
npx prisma generate
```

Use the existing migrations to create the database schema.

### 5. Start the application

Development mode:

```bash
npm run start:dev
```

The default local base URL is:

```text
http://localhost:3000
```

Use the port configured by your application if it differs.

## API Endpoints

Protected endpoints require a JWT access token:

```http
Authorization: Bearer <access_token>
```

| Method | Endpoint         | Description                       |
| ------ | ---------------- | --------------------------------- |
| POST   | `/auth/register` | Register a user                   |
| POST   | `/auth/login`    | Authenticate a user               |
| GET    | `/health`        | Check application/database health |
| POST   | `/sms/calculate` | Calculate SMS parts and cost      |
| POST   | `/sms/send`      | Send SMS using provider failover  |
| GET    | `/sms/logs`      | Retrieve paginated SMS logs       |
| GET    | `/routes/health` | Retrieve provider health metrics  |

Authentication route names should be verified against the implemented controller before submission.

### Register and Login

Register a user and then log in to obtain a JWT access token.

Use the token for protected SMS and route endpoints.

### Calculate SMS Cost

Example request:

```http
POST /sms/calculate
Content-Type: application/json
Authorization: Bearer <access_token>
```

```json
{
  "to": ["9841234567"],
  "message": "Hello from Mini SMS Gateway"
}
```

The response should describe the calculated SMS encoding, message parts, and required credits according to the implementation.

### Send SMS

```http
POST /sms/send
Content-Type: application/json
Authorization: Bearer <access_token>
```

```json
{
  "to": ["9841234567"],
  "message": "Hello from Mini SMS Gateway"
}
```

A successful response includes the request ID, delivery status, selected provider, recipient information, credits charged, and remaining wallet balance.

If the wallet does not have enough credits, the request is rejected.

If all providers fail, the deducted credits are refunded.

### Retrieve SMS Logs

```http
GET /sms/logs?page=1&limit=10
Authorization: Bearer <access_token>
```

Available filters include:

- `page`
- `limit`
- `status`
- `number`
- `from`
- `to`

Check the controller implementation for the exact accepted date formats and parameter validation.

### Check Provider Health

```http
GET /routes/health
Authorization: Bearer <access_token>
```

The response includes provider priority, balance, successful attempts, failed attempts, success rate, health percentage, and status.

## SMS Pricing and Encoding

SMS cost depends on the message encoding and the number of SMS parts calculated by the application.

The gateway supports GSM 7-bit and Unicode encoding. Unicode messages, including many Nepali-language messages, can have different part limits from GSM 7-bit messages.

The calculator determines the required parts and credits. Refer to the implementation for the exact pricing rules and encoding thresholds.

## Provider Routing and Failover

Providers are ordered by priority.

1. The gateway validates the request and calculates its cost.
2. It atomically deducts the required credits from the user's wallet.
3. It creates pending SMS logs.
4. It attempts delivery through the highest-priority provider.
5. If delivery fails, it records the failed attempt and tries the next provider.
6. If a provider succeeds, the SMS logs are marked as sent.
7. If every provider fails, the gateway refunds the wallet credits and marks the logs as failed.

Provider balances and failure rates are configurable through environment variables. The mock provider balances are maintained in application memory, so they reset when the process restarts.

## Wallet Safety and Concurrency

Wallet deductions use a conditional database update that only succeeds when the current balance is sufficient.

Conceptually, the update is equivalent to:

```sql
UPDATE "Wallet"
SET balance = balance - 1
WHERE id = $1
  AND balance >= 1;
```

The application checks the number of affected rows. If no wallet row is updated, the request is rejected for insufficient balance.

The actual implementation uses Prisma rather than executing this example SQL directly.

This protects the wallet from concurrent requests overspending the available credits.

### Concurrency Test

A local concurrency test sent 20 SMS requests simultaneously using a wallet with 10 credits and providers configured with zero simulated failure rates.

Observed results:

| Metric                  | Result |
| ----------------------- | -----: |
| Concurrent requests     |     20 |
| Successful SMS requests |     10 |
| Rejected requests       |     10 |
| Network errors          |      0 |
| Final wallet balance    |      0 |

This verifies that the wallet did not become negative during the tested scenario.

To reproduce the test, use a dedicated development account with exactly 10 credits, ensure provider balances are sufficient, set both provider failure rates to `0`, restart the application, and run the concurrency test script.

Do not run this test against production accounts.

## Provider Health Formula

Provider health is calculated from recorded provider attempts during the previous 24 hours.

```text
successRate = successfulAttempts / totalAttempts * 100

healthPercentage = successRate
```

Where:

- `successfulAttempts` is the number of successful provider attempts.
- `totalAttempts` is the sum of successful and failed attempts.
- `healthPercentage` uses the same percentage as the success rate.

If no attempts exist during the measurement window, the success rate is `null` and the provider status is `NO_DATA`.

The current implementation classifies a provider as:

- `HEALTHY`: success rate is at least 80%.
- `DEGRADED`: success rate is below 80%.
- `NO_DATA`: no recorded attempts exist during the window.

These metrics reflect recorded mock-provider attempts, not real telecommunications carrier availability.

## Testing

Run the automated test suite:

```bash
npm test -- --runInBand
```

Run TypeScript type checking:

```bash
npx tsc --noEmit
```

Run end-to-end tests if configured:

```bash
npm run test:e2e
```

The project has passed the following checks during development:

- 5 Jest test suites passed.
- 38 automated tests passed.
- TypeScript type checking completed without errors.
- Provider failover was manually tested.
- All-provider failure and refund behavior was manually tested.
- Concurrent wallet deduction was manually tested.

Re-run these checks against the final code before submitting.

## Development Credits

The project includes a development-only credit script.

Example:

```bash
npx ts-node scripts/add-dev-credits.ts <email> <credits>
```

The script requires `ALLOW_DEV_CREDIT=true` and refuses to run when `NODE_ENV=production`.

Only use it with development accounts and a development database. It adds credits rather than setting a wallet to an exact balance.

## Design Decisions

- **PostgreSQL:** Provides persistent relational storage and transactional wallet operations.
- **Prisma:** Provides typed database access and migration management.
- **Conditional wallet updates:** Prevent overspending when multiple requests compete for the same balance.
- **Provider abstraction:** Makes it possible to replace mock providers with real SMS provider integrations.
- **Provider attempt records:** Preserve individual success and failure outcomes for health calculations.
- **Refunds:** Restore charged credits when all provider attempts fail.
- **Environment configuration:** Allows failure rates and provider balances to be changed without editing source code.

## Limitations

- Providers are mocked; no real SMS messages are delivered.
- Mock provider balances are in memory and reset after a restart.
- No durable queue or background retry system is included unless separately configured.
- Provider health is based on recorded attempts and does not guarantee actual carrier availability.
- The concurrency test covers the tested local scenario, not every possible distributed deployment failure.

## Future Improvements

- Integrate real SMS providers.
- Add durable background jobs using BullMQ and Redis.
- Add per-user rate limiting.
- Implement delivery webhooks and delivery-status updates.
- Add idempotency keys to prevent duplicate sends during retries.
- Add stronger monitoring, structured logging, and alerting.
- Add Docker Compose for repeatable local development.
- Add integration tests for transaction rollback, refunds, and concurrent requests.
- Add production-grade secrets management and deployment configuration.

## License

This project was developed as a backend engineering assignment. Add a license file if the repository will be distributed under a specific open-source license.
