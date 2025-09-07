# Next.js E-commerce — Repo Plan & TODOs

Scope: Shopify-class e-commerce with modern storefront, powerful Admin CMS, Razorpay checkout, and search.
Infra/observability are postponed initially (can be added later). Use Docker locally for Postgres, Redis, Meilisearch.

## Tech Stack

- Framework: Next.js 14 (App Router, Server Actions), TypeScript
- UI: Tailwind CSS + shadcn/ui + lucide-react
- Auth: NextAuth (email OTP; OAuth optional), Admin RBAC
- DB/ORM: PostgreSQL + Drizzle ORM (SQL-first migrations)
- Cache/Jobs: Redis (+ BullMQ for background jobs later)
- Search: Meilisearch (product search, facets, synonyms)
- Payments: Razorpay (Orders API) + secure webhooks
- Storage: Firebase Storage (images) — alt text & variants
- State: TanStack Query (server data), Zustand (UI)
- Emails/PDF: Resend (or SMTP) + React Email; Invoice/Packing slip PDFs

## Local Dev — Docker

Create docker-compose.yml with services:

- postgres:15-alpine (db: ecommerce, user: ecommerce, password: ecommerce)
- redis:7-alpine
- meilisearch: latest (MEILI_MASTER_KEY)
- mailhog: (optional for email dev)
  Expose ports as needed; mount named volumes for data persistence.

## Example docker-compose snippet

version: "3.9"
services:
postgres:
image: postgres:15-alpine
restart: unless-stopped
environment:
POSTGRES_DB: ecommerce
POSTGRES_USER: ecommerce
POSTGRES_PASSWORD: ecommerce
ports: ["5432:5432"]
volumes: - pgdata:/var/lib/postgresql/data
redis:
image: redis:7-alpine
command: ["redis-server", "--appendonly", "yes"]
ports: ["6379:6379"]
volumes: - redisdata:/data
meilisearch:
image: getmeili/meilisearch:latest
environment:
MEILI_NO_ANALYTICS: "true"
MEILI_MASTER_KEY: "dev_master_key_change_me"
ports: ["7700:7700"]
volumes: - meilidata:/meili_data
mailhog:
image: mailhog/mailhog
ports: ["1025:1025", "8025:8025"]
volumes:
pgdata: {}
redisdata: {}
meilidata: {}

## .env.example (add to repo root)

# App

NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development

# DB

DATABASE_URL=postgres://ecommerce:ecommerce@localhost:5432/ecommerce

# Auth

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace_with_strong_secret

# Razorpay

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=replace_with_random_string

# Redis

REDIS_URL=redis://localhost:6379

# Meilisearch

MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_MASTER_KEY=dev_master_key_change_me

# Firebase (Storage only—optional during early dev)

FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=

# Emails

RESEND_API_KEY=
SMTP_HOST=localhost
SMTP_PORT=1025

## Repository Structure

/app
/(storefront) — home, collections, product, cart, checkout
/(admin) — products, orders, customers, discounts, content, settings, dashboard
/api — route handlers (webhooks, search, misc)
/components — shared UI
/db — drizzle schema & migrations
/jobs — (later) BullMQ processors
/lib — utils (auth, rbac, cache, zod, seo)
/public — assets
/scripts — seed and maintenance scripts
