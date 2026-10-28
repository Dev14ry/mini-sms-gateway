# Mini SMS Gateway API

A backend SMS gateway API built with NestJS, TypeScript, Prisma, and PostgreSQL. The application provides authentication, wallet management, SMS cost calculation, SMS sending with provider failover, transaction logging, and route health monitoring.

## Project Links

- **GitHub Repository:** https://github.com/Dev14ry/mini-sms-gateway
- **Live API:** https://mini-sms-gateway-5lf6.onrender.com/
- **Health Check:** https://mini-sms-gateway-5lf6.onrender.com/health
- **Docker Hub:** https://hub.docker.com/r/dev14ry/mini-sms-gateway

## Features

- User registration and login
- JWT-based authentication
- Wallet balance management
- Credit deduction and transaction history
- SMS cost calculation for GSM-7 and Unicode messages
- Nepal mobile number validation and normalization
- SMS sending through prioritized provider routes
- Provider failover when a route fails
- SMS logs and provider attempt records
- Automatic wallet refund when all provider routes fail
- Provider route health monitoring
- PostgreSQL database integration
- Docker-based local development and deployment
- Automated unit and end-to-end testing
- Concurrency testing for wallet deductions

## Technology Stack

| Technology     | Purpose                           |
| -------------- | --------------------------------- |
| NestJS         | Backend framework                 |
| TypeScript     | Application development           |
| PostgreSQL     | Relational database               |
| Prisma ORM     | Database access and migrations    |
| Node.js        | JavaScript runtime                |
| Docker         | Containerization                  |
| Docker Compose | Local multi-container environment |
| Jest           | Automated testing                 |
| Render         | API deployment                    |
| Neon           | Hosted PostgreSQL database        |

## Architecture Overview

```text
Client / API Tester
        |
        v
    NestJS API
        |
        +---- Authentication
        |
        +---- Wallet Service
        |        |
        |        v
        |     PostgreSQL
        |
        +---- SMS Service
        |        |
        |        v
        |   Provider Routing
        |     /        \
        | Route A     Route B
        |
        +---- Route Health
```

The application uses PostgreSQL to persist users, wallets, wallet transactions, SMS logs, and provider attempts. The SMS provider routes in this project are simulated rather than connected to real SMS providers.

## API Endpoints

All routes are relative to the API base URL.

| Method | Endpoint               | Purpose                             |
| ------ | ---------------------- | ----------------------------------- |
| GET    | `/health`              | Check API and database health       |
| POST   | `/auth/register`       | Register a user                     |
| POST   | `/auth/login`          | Authenticate a user                 |
| GET    | `/auth/me`             | Get the authenticated user          |
| GET    | `/wallet`              | Retrieve wallet information         |
| POST   | `/wallet/deduct`       | Deduct wallet credits               |
| GET    | `/wallet/transactions` | Retrieve wallet transaction history |
| POST   | `/sms/calculate`       | Calculate SMS segments and cost     |
| POST   | `/sms/send`            | Submit an SMS request               |
| GET    | `/sms/logs`            | Retrieve SMS logs                   |
| GET    | `/routes/health`       | Check provider route health         |

Protected endpoints require the authentication token in the format expected by the application, typically:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Check the relevant DTOs and controllers for the exact request fields, response schemas, and validation rules.

## Getting Started

### Prerequisites

Install the following tools:

- Node.js 24
- npm
- Docker Desktop
- Git

### Clone the Repository

```bash
git clone https://github.com/Dev14ry/mini-sms-gateway.git
cd mini-sms-gateway
```

### Install Dependencies

```bash
npm ci
```

### Configure Environment Variables

Create a local `.env` file using the environment variable names expected by the application.

Do not commit `.env` or publish real database credentials, JWT secrets, or provider credentials.

The application uses `DATABASE_URL` to connect to PostgreSQL. Prisma configuration is defined in `prisma7.config.ts`.

### Start the Application with Docker

Ensure Docker Desktop is running, then execute:

```bash
docker compose up -d --build
```

Check the containers:

```bash
docker compose ps
```

View application logs:

```bash
docker compose logs -f api
```

View database logs:

```bash
docker compose logs -f db
```

Stop the containers:

```bash
docker compose down
```

To stop the containers and also delete the local PostgreSQL data volume, use:

```bash
docker compose down -v
```

**Warning:** `docker compose down -v` deletes the local database volume. Do not run it if you need to preserve local data.

### Verify the Application

Open the health endpoint:

```text
http://localhost:3000/health
```

Or run:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

The health endpoint should report a healthy API and connected database.

## Environment Configuration

Configure the variables supported by the project in your local environment.

| Variable               | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection URL                 |
| `PORT`                 | API listening port                        |
| `NODE_ENV`             | Runtime environment                       |
| `ALLOW_DEV_CREDIT`     | Controls development credit functionality |
| `ROUTE_A_BALANCE`      | Simulated Route A balance                 |
| `ROUTE_A_FAILURE_RATE` | Simulated Route A failure probability     |
| `ROUTE_B_BALANCE`      | Simulated Route B balance                 |
| `ROUTE_B_FAILURE_RATE` | Simulated Route B failure probability     |

Use the project's `.env.example` or configuration files to confirm the complete list of required variables and their defaults. Never publish production secrets in the README.

## Concurrency Testing

### Objective

Concurrency testing verifies that multiple requests attempting to deduct credits from the same wallet simultaneously cannot spend more credits than are available.

For example, a wallet starts with 10 credits. Twenty concurrent requests each attempt to deduct 1 credit.

The expected outcome is:

| Metric                | Expected result |
| --------------------- | --------------: |
| Initial balance       |      10 credits |
| Concurrent requests   |              20 |
| Successful deductions |              10 |
| Rejected deductions   |              10 |
| Final balance         |       0 credits |
| Negative balance      |              No |

### Why Concurrency Testing Is Important

Without appropriate concurrency protection, multiple requests may read the same wallet balance before any of them completes its deduction. This can cause a race condition and an incorrect balance.

The wallet deduction operation should use suitable database-level protection, such as a transaction, atomic update, or conditional balance update. The exact mechanism depends on the implementation.

### Prepare the Test Environment

1. Start the API and database.
2. Use a dedicated test account and test database.
3. Ensure the wallet has exactly 10 credits.
4. Obtain a valid authentication token.
5. Confirm the initial balance using `GET /wallet`.
6. Configure the test script with the correct deduction request body.

Do not run a balance-reset or credit-grant operation against a production account.

### Concurrency Test Script

Save the following file as `scripts/concurrency-test.mjs`.

```javascript
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const TOKEN = process.env.TEST_TOKEN;

// IMPORTANT:
// Replace this with the exact JSON payload accepted by
// your POST /wallet/deduct endpoint.
const DEDUCTION_BODY = {
  // Add the actual DTO fields here.
};

const CONCURRENT_REQUESTS = 20;
const EXPECTED_INITIAL_BALANCE = 10;
const CREDITS_PER_REQUEST = 1;

if (!TOKEN) {
  console.error('Missing TEST_TOKEN environment variable.');
  process.exit(1);
}

if (Object.keys(DEDUCTION_BODY).length === 0) {
  console.error('Configure DEDUCTION_BODY to match the wallet deduction DTO.');
  process.exit(1);
}

async function getWallet() {
  const response = await fetch(`${BASE_URL}/wallet`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`GET /wallet failed: HTTP ${response.status}: ${body}`);
  }

  return JSON.parse(body);
}

async function deductCredit(index) {
  try {
    const response = await fetch(`${BASE_URL}/wallet/deduct`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(DEDUCTION_BODY),
    });

    const responseBody = await response.text();

    return {
      request: index,
      status: response.status,
      body: responseBody,
      ok: response.ok,
    };
  } catch (error) {
    return {
      request: index,
      status: 0,
      body: String(error),
      ok: false,
      networkError: true,
    };
  }
}

async function main() {
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Concurrent requests: ${CONCURRENT_REQUESTS}`);

  const initialWallet = await getWallet();

  console.log('Initial wallet response:', initialWallet);

  // Confirm the wallet has the expected balance before testing.
  // Update this extraction after checking the actual GET /wallet
  // response schema.
  const initialBalance = Number(initialWallet.balance);

  if (!Number.isFinite(initialBalance)) {
    throw new Error(
      'Could not read initialWallet.balance. Update the script to match GET /wallet.',
    );
  }

  if (initialBalance !== EXPECTED_INITIAL_BALANCE) {
    throw new Error(
      `Expected initial balance ${EXPECTED_INITIAL_BALANCE}, got ${initialBalance}.`,
    );
  }

  console.log('\nSending requests concurrently...\n');

  const results = await Promise.all(
    Array.from({ length: CONCURRENT_REQUESTS }, (_, index) =>
      deductCredit(index + 1),
    ),
  );

  const successful = results.filter((result) => result.ok);
  const rejected = results.filter((result) => !result.ok);

  console.log('=== Individual Responses ===');

  for (const result of results) {
    console.log(
      `Request ${result.request}: HTTP ${result.status} | ${
        result.ok ? 'SUCCESS' : 'REJECTED/ERROR'
      } | ${result.body}`,
    );
  }

  console.log('\n=== Summary ===');
  console.log(`Total requests: ${results.length}`);
  console.log(`Successful HTTP responses: ${successful.length}`);
  console.log(`Rejected/error responses: ${rejected.length}`);

  const finalWallet = await getWallet();

  console.log('\nFinal wallet response:', finalWallet);

  // Adapt this field extraction to the real wallet response.
  const finalBalance = Number(finalWallet.balance);

  if (!Number.isFinite(finalBalance)) {
    throw new Error(
      'Could not read finalWallet.balance. Update the script to match GET /wallet.',
    );
  }

  console.log(`Initial balance: ${initialBalance}`);
  console.log(`Final balance: ${finalBalance}`);

  const expectedSuccessfulRequests =
    EXPECTED_INITIAL_BALANCE / CREDITS_PER_REQUEST;

  const expectedFinalBalance =
    EXPECTED_INITIAL_BALANCE - successful.length * CREDITS_PER_REQUEST;

  const valid =
    successful.length === expectedSuccessfulRequests &&
    rejected.length === CONCURRENT_REQUESTS - expectedSuccessfulRequests &&
    finalBalance === expectedFinalBalance &&
    finalBalance >= 0;

  console.log(`\nConcurrency check: ${valid ? 'PASSED' : 'FAILED'}`);

  if (!valid) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Concurrency test failed:', error.message);
  process.exitCode = 1;
});
```

**Before running:** Check the actual DTO for `POST /wallet/deduct` and response from `GET /wallet`. Update `DEDUCTION_BODY` and the balance extraction if the response uses a different field or nested object. The script intentionally stops when the expected balance cannot be read, rather than reporting a false pass.

### Run the Script

Make sure your Node.js version supports `fetch`, then run the script from the project root.

PowerShell:

```powershell
$env:BASE_URL = "http://localhost:3000"
$env:TEST_TOKEN = "YOUR_TEST_ACCOUNT_TOKEN"
node scripts/concurrency-test.mjs
```

Use a dedicated test token. Avoid saving real tokens in source files or screenshots.

The script uses `Promise.all()` to initiate the 20 requests concurrently. It then prints each HTTP response, counts successful and rejected responses, reads the final wallet balance, and performs basic checks.

### Expected Output

With the stated test setup and correct request payload, a successful run should produce a summary similar to:

```text
=== Summary ===
Total requests: 20
Successful HTTP responses: 10
Rejected/error responses: 10
Initial balance: 10
Final balance: 0

Concurrency check: PASSED
```

This is an **illustrative expected output**, not a claim that the script has just been executed. Your actual status codes and response bodies depend on the application's implementation.

The script currently treats every non-2xx response as rejected/error. For rigorous results, confirm that the rejected responses specifically represent insufficient credits, not authentication errors, validation errors, or server failures.

### Verify the Transaction History

After the test, inspect:

```http
GET /wallet/transactions
Authorization: Bearer YOUR_TEST_TOKEN
```

Confirm that the successful deductions are recorded consistently and rejected requests did not deduct credits.

A valid result should have:

- 10 successful one-credit deductions.
- 10 insufficient-credit responses.
- A final balance of 0.
- No negative balance.
- No extra debit transactions.

### Previous Test Result

A previous run reported 20 parallel requests against a balance of 10, resulting in 10 successful deductions, 10 insufficient-credit responses, and a final balance of 0. Re-run the test and save fresh output before using it as current assignment evidence.

## SMS Processing and Provider Failover

The application includes SMS cost calculation and simulated provider routing.

The SMS flow is designed to:

1. Validate and normalize the destination number.
2. Calculate message encoding, segments, and cost.
3. Create SMS log and provider-attempt records.
4. Attempt providers according to configured priority.
5. Mark the SMS as sent when a route succeeds.
6. Refund deducted credits and mark the SMS failed if all routes fail.

The configured routes are:

| Route   | Priority | Default simulated failure rate |
| ------- | -------: | -----------------------------: |
| Route A |        1 |                            0.3 |
| Route B |        2 |                            0.1 |

A failure rate of `1` represents always failing, while `0` represents no random simulated failures. These routes are simulations and do not demonstrate delivery through real telecom providers.

## Route Health Monitoring

Use:

```http
GET /routes/health
```

The route health logic evaluates provider attempts over the previous 24 hours. It reports the success rate based on successful attempts divided by total attempts.

- `NO_DATA` is returned when no attempts are available.
- `HEALTHY` is reported when the success rate is at least 80%.
- `DEGRADED` is reported when the success rate is below 80%.

The exact response structure is defined by the route health controller.

## Running Automated Tests

Run the unit and integration test suites:

```bash
npm test -- --runInBand
```

Run end-to-end tests:

```bash
npm run test:e2e -- --runInBand
```

A test command only verifies scenarios included in the configured test files. The standalone concurrency script above is a separate manual load/concurrency check.

## Deployment

The API is deployed on Render, with PostgreSQL hosted on Neon.

- API: https://mini-sms-gateway-5lf6.onrender.com/
- Health check: https://mini-sms-gateway-5lf6.onrender.com/health
- Docker image: https://hub.docker.com/r/dev14ry/mini-sms-gateway

For production deployments:

- Configure environment variables through the hosting platform's secret manager.
- Use a production database with backups.
- Apply Prisma migrations as part of a controlled deployment process.
- Restrict CORS and database access as appropriate.
- Add structured logging, monitoring, and alerts.
- Do not expose development credit functionality.
- Rotate credentials immediately if they are accidentally exposed.

## Current Limitations

- Provider routes are simulated and do not deliver real SMS messages.
- Route balances are held in memory and reset when the application restarts.
- Random provider failure rates are intended for testing, not production routing.
- The concurrency script must be configured against the actual request DTO and wallet response schema.
- Production readiness requires additional monitoring, security hardening, and operational testing.

## Future Improvements

- Integrate real SMS provider APIs.
- Persist provider balances and routing metrics.
- Add automated concurrency regression tests to the test suite.
- Add load testing using k6 and dashboards using Grafana.
- Add structured logging, metrics, and alerts.
- Add CI/CD automation and security scanning.

## License

Check the repository's licensing terms before reusing or redistributing this project.
