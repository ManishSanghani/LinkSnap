# LinkSnap

LinkSnap is a production-grade URL shortener built for a backend engineering portfolio. It demonstrates authenticated URL creation, cache-aside reads with Redis, MongoDB persistence, API rate limiting, expiry handling, Dockerized local development, and a GitHub Actions deployment pipeline for Render.

Live demo: _coming soon_

## Features

- JWT authentication for protected URL management routes
- 7-character nanoid short codes with optional custom aliases
- Clean public redirects at `/:shortCode`
- Redis cache-aside lookup for fast redirects
- MongoDB TTL index for automatic expiry cleanup
- Fire-and-forget click tracking to keep redirects fast
- Owner-only analytics and delete operations
- Redis-backed IP rate limiting
- Docker, docker-compose, and GitHub Actions CI/CD

## Architecture

### Cache-aside pattern

Redirects first check Redis for `url:<shortCode>`. On a cache hit, LinkSnap validates expiry and redirects immediately. On a miss, it queries MongoDB, rejects missing or expired links, then stores the URL in Redis with a TTL equal to the remaining lifetime. Redis failures are caught and logged so MongoDB remains the source of truth.

### Rate limiting strategy

The API uses `express-rate-limit` with `rate-limit-redis`. A global limiter allows 100 requests per IP every 15 minutes. The URL creation endpoint has a stricter limiter of 20 requests per IP per hour. Store errors are passed through so Redis outages do not take the API offline.

### TTL and expiry

Each shortened URL stores `expiresAt` in MongoDB. A TTL index removes expired documents automatically. Redis cache entries use `EX` with the remaining seconds until expiry. Redirects still validate `expiresAt` on cache hits and return `410 Gone` if a stale cached item is encountered.

## Local Setup

### Without Docker

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create an environment file:

   ```bash
   cp .env.example .env
   ```

3. Start MongoDB and Redis locally.

4. Run the API:

   ```bash
   npm run dev
   ```

### With Docker

1. Create an environment file:

   ```bash
   cp .env.example .env
   ```

2. Start the stack:

   ```bash
   docker compose up --build
   ```

The API will be available at `http://localhost:5000`.

Interactive API docs are available at `http://localhost:5000/api-docs`.

## API Endpoints

| Method | Route | Auth Required | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Health check |
| `GET` | `/api-docs` | No | Interactive Swagger API documentation |
| `POST` | `/api/auth/register` | No | Register a user and return a JWT |
| `POST` | `/api/auth/login` | No | Log in and return a JWT |
| `POST` | `/api/urls/shorten` | Yes | Create a short URL |
| `GET` | `/:shortCode` | No | Redirect to the original URL |
| `GET` | `/api/urls/:shortCode/analytics` | Yes | Return analytics for an owned URL |
| `GET` | `/api/urls/my` | Yes | Return all URLs created by the logged-in user |
| `DELETE` | `/api/urls/:shortCode` | Yes | Delete an owned URL and its cache entry |

## Environment Variables

| Variable | Example | Description |
| --- | --- | --- |
| `PORT` | `5000` | API server port |
| `MONGO_URI` | `mongodb://localhost:27017/linksnap` | MongoDB connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis or Upstash Redis connection string |
| `JWT_SECRET` | `your_jwt_secret_here` | Secret used to sign JWTs |
| `BASE_URL` | `http://localhost:5000` | Public base URL used in short URL responses |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated allowed browser origins. Leave empty to allow all origins |
| `NODE_ENV` | `development` | Runtime environment |

## What To Add Next

- WebSocket click tracking for live dashboards
- Geo analytics and referrer breakdowns
- Custom domains per user or organization
