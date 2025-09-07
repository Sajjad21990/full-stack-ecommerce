# Save the concise prompts as a .txt file for the user to add to their repo

concise_prompts = """
Next.js E-commerce — Phase-wise Prompts (Concise)
=================================================

## Phase 0 — Scaffold & Environment

You are a senior full stack engineer. Help me scaffold a Next.js 14 (App Router) project similar to shopify with TypeScript, Tailwind, shadcn/ui, and lucide-react.

- Structure: app/(storefront), app/(admin), app/api, db, lib, components, scripts
- Add ESLint, Prettier, Husky, lint-staged
- Create docker-compose.yml for Postgres, Redis, Meilisearch, Mailhog with named volumes
- Add .env.example with DATABASE*URL, NEXTAUTH*\_, RAZORPAY\__, REDIS*URL, MEILISEARCH*_, FIREBASE\_\_
- Implement NextAuth email OTP scaffold and minimal /admin protected route with RBAC stubs
- Provide README setup steps and commands to run docker + start the app

## Phase 1 — Drizzle Schemas & Seed

You are a senior full stack engineer. Define Drizzle schemas for Postgres covering:
users/roles/permissions, customers/addresses, products/options/variants, collections/categories/product_categories, inventory (locations, stock_levels), carts/cart_items, orders/order_items/payments/refunds/shipments/returns, discounts, tax_zones/tax_rates, media_assets, metafields, webhooks, audit_logs.

- Use SQL-first, add indexes and foreign keys
- Store money in minor units (integer)
- Provide migrations and types
- Add a seed.ts with 10 products + variants, 2 collections, 2 discounts
- Add scripts for generate, migrate, and seed

## Phase 2 — Storefront (PLP, PDP, Cart)

You are a senior full stack engineer. Build storefront pages with Next.js 14:

- Home, Collection (PLP), Product (PDP) with ISR and segment caching
- PDP: variant selection, price/compare, inventory badge, gallery, metafields
- Implement server actions for addToCart, updateQty, removeItem with Zod validation and cookie cart_id
- Return updated cart summary JSON
- Add structured data (Product, BreadcrumbList) and solid SEO metadata helpers

## Phase 3 — Admin: Products & Media

You are a senior full stack engineer. Build Admin CMS for product management:

- Admin shell with navigation and RBAC guards
- Products list with filters, search, bulk select
- Product editor with title, handle (auto/override), MDX description, SEO fields
- Options/Variants grid: define options, auto-generate variants, per-variant price/sku/inventory with bulk edit
- Firebase image upload with reorder and variant assignment
- Publish/unpublish triggers ISR revalidation for PDP and affected PLPs
- Write unit tests for server actions

## Phase 4 — Checkout & Razorpay

You are a senior full stack engineer. Implement checkout and Razorpay integration:

- Checkout flow: email, shipping/billing address (Zod), flat-rate shipping method
- Server creates Razorpay order; client opens Razorpay Checkout
- Add /app/api/webhooks/razorpay that verifies HMAC, finalizes order idempotently, decrements stock, and sends email receipt
- Handle payment.failure with retryable job (BullMQ stub)
- Include tests for webhook verification and idempotency

## Phase 5 — Orders, Fulfillment, Returns

You are a senior full stack engineer. Build Admin Orders management:

- Orders list with filters; detail page with event timeline
- Actions: add note, create shipment (carrier, tracking), partial fulfillment
- Generate invoice and packing slip PDFs
- Returns: RMA request → approve/deny → restock → refund via Razorpay
- Update audit logs and enforce RBAC permissions
- Include PDF utilities and React Email template stubs

## Phase 6 — Discounts, Gift Cards, Search

You are a senior full stack engineer. Implement discounts, gift cards, and search:

- Discounts: percent/fixed/free-ship with eligibility (collections/products/min spend/first order), scheduling, usage limits
- Cart application with priority and stacking rules
- Gift cards: code generation and redemption (optional V1)
- Meilisearch setup with index mapping, synonyms, facet fields (category, price, availability, size/color)
- Sync job on product publish/update
- Build search API and UI with autocomplete and filters

## Phase 7 — CMS, Menus, Content Blocks

You are a senior full stack engineer. Build Admin CMS for content:

- Menus: header/footer builder with drag-drop and preview
- MDX pages (About/FAQ/Policy)
- Homepage blocks: hero, promo tiles, collection grid, testimonials; reorderable with persistence
- ISR revalidation on publish
- Add role-based access for content editors

## Phase 8 — Admin Analytics Dashboard (Good-to-have)

You are a senior full stack engineer. Build an analytics dashboard for Admin CMS:

- KPIs: revenue, orders, AOV, top SKUs, low stock, conversion proxy, abandoned carts proxy
- Charts: daily revenue and orders (last 30 days)
- Provide API endpoints for dashboard data; fetch with TanStack Query
- Add seed data so charts show sample values
  """

concise_prompts_path = "/mnt/data/concise_phase_prompts.txt"
with open(concise_prompts_path, "w", encoding="utf-8") as f:
f.write(concise_prompts)

concise_prompts_path
