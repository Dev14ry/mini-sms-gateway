
FROM node:24-bookworm-slim

WORKDIR /app

# Install OpenSSL required by Prisma.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate Prisma Client before building NestJS.
RUN npx prisma generate --config prisma7.config.ts

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Apply migrations and start the compiled NestJS application.
CMD ["sh", "-c", "npx prisma migrate deploy --config prisma7.config.ts && node dist/src/main.js"]
