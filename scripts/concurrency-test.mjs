
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.TOKEN;
const REQUEST_COUNT = 20;

if (!TOKEN) {
    console.error('Error: Set the TOKEN environment variable first.');
    process.exit(1);
}

async function sendSms(index) {
    try {
        const response = await fetch(`${BASE_URL}/sms/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${TOKEN}`,
            },
            body: JSON.stringify({
                to: ['9841234567'],
                message: `Concurrency test ${index + 1}`,
            }),
        });

        const text = await response.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = { message: text };
        }

        return {
            request: index + 1,
            httpStatus: response.status,
            smsStatus: data.status ?? 'REJECTED',
            provider: data.provider ?? null,
            error: data.message ?? data.error ?? null,
        };
    } catch (error) {
        return {
            request: index + 1,
            httpStatus: 0,
            smsStatus: 'NETWORK_ERROR',
            error: error.message,
        };
    }
}

async function main() {
    console.log(`Sending ${REQUEST_COUNT} requests concurrently...`);
    console.log(`Target: ${BASE_URL}/sms/send`);

    const results = await Promise.all(
        Array.from({ length: REQUEST_COUNT }, (_, index) =>
            sendSms(index),
        ),
    );

    const sent = results.filter(
        (result) => result.smsStatus === 'SENT',
    );

    const rejected = results.filter(
        (result) =>
            result.smsStatus !== 'SENT' &&
            result.smsStatus !== 'NETWORK_ERROR',
    );

    const networkErrors = results.filter(
        (result) => result.smsStatus === 'NETWORK_ERROR',
    );

    console.log('\n--- CONCURRENCY TEST RESULTS ---');
    console.log(`Total requests: ${results.length}`);
    console.log(`SMS sent: ${sent.length}`);
    console.log(`Rejected/failed: ${rejected.length}`);
    console.log(`Network errors: ${networkErrors.length}`);

    console.log('\n--- INDIVIDUAL RESULTS ---');
    console.table(results);

    console.log('\nExpected: 10 SENT, 10 rejected, 0 network errors.');
    console.log('Check wallet balance in Prisma Studio afterward.');
}

main().catch((error) => {
    console.error('Test failed:', error);
    process.exitCode = 1;
});
