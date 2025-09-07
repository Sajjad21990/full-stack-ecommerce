## Phases & TODOs

PHASE 0 — Foundations
[x] Create Next.js 14 project; set TS strict mode, ESLint, Prettier, Husky, lint-staged
[x] Add Tailwind, shadcn/ui (init), lucide-react
[x] Add Docker: compose (postgres, redis, meilisearch, mailhog)
[x] Drizzle setup (drizzle-kit, db client) + first migration
[x] NextAuth scaffold with Email OTP; minimal /admin gate
[x] .env.example; README with setup instructions

PHASE 1 — Data Model (Drizzle)
[x] Users, Roles, Permissions (RBAC basic)
[x] Customers, Addresses
[x] Products, ProductOptions, OptionValues, ProductVariants
[x] Collections, Categories, ProductCategories
[x] Inventory: Locations, StockLevels (qty, reserved)
[x] Carts, CartItems
[x] Orders, OrderItems, Payments, Refunds, Shipments, Returns
[x] Discounts (code/auto), GiftCards (V1 optional)
[x] TaxZones, TaxRates; ShippingZones, ShippingRates (flat)
[x] MediaAssets, Metafields
[x] Webhooks, AuditLogs
[x] Seed script (10 products w/ variants, 2 collections, 2 discounts)

PHASE 2 — Storefront Core
[x] Home: hero, promos, featured collection
[x] PLP (Collection/Category): pagination, filters (price, category, availability, size/color)
[x] PDP: variant selection, price/compare, availability, gallery, metafields
[x] Cart: server-side (cookie cart_id); actions add/update/remove; mini-cart
[x] SEO: dynamic metadata, OpenGraph, structured data
[x] Perf: ISR for PLP/PDP; image optimization; route segment caching

PHASE 3 — Admin: Products & Media
[x] Admin shell + nav + RBAC guards
[x] Products list: filters, search, bulk select
[x] Product editor: title, handle, MDX description, SEO
[x] Options/Variants: define options, auto-generate variants, per-variant price/sku/inventory
[x] Media: Firebase upload/reorder; variant image chooser
[x] Publish/unpublish; ISR revalidation for PDP & affected PLPs
[x] Audit log entries per admin action

PHASE 4 — Checkout & Payments (Razorpay)
[x] Checkout: email, shipping/billing address (Zod), shipping method (flat)
[x] Razorpay order creation (server), client checkout integration
[x] Webhook: HMAC verify, idempotent finalize order, decrement stock, email receipt
[x] Payment failure handling: retry/backoff; idempotency keys
[x] Order confirmation page; invoice numbering; basic GST fields

PHASE 5 — Orders, Fulfillment, Returns
[x] Admin Orders: list + filters; detail with timeline (payment/fulfillment/refund/notes)
[x] Fulfillment: create shipment (carrier, tracking), partial fulfillment; packing slip PDF
[x] Returns: RMA request → approve/deny → restock/refund; record refund to Razorpay
[x] Customers: profile, addresses, past orders; export CSV

PHASE 6 — Discounts, Gift Cards, Search
[x] Discounts: %/fixed/free-ship; eligibility (collections/products/min spend/first order); scheduling; usage limits
[x] Cart application & priority rules; stacking (simple)
[x] Gift cards: codes generate/redeem at checkout (optional V1)
[x] Meilisearch indexing job on product publish/update; facet config (category, price, availability, size/color)
[x] Search UI + autocomplete; pagination & scoring tweak hooks

PHASE 7 — CMS, Menus, Blocks
[x] Menus: header/footer builders; preview
[x] Pages: About/FAQ/Policy (MDX)
[x] Home blocks: hero, promo tiles, collection grid, testimonials (reorderable)
[x] ISR revalidation hooks on publish

PHASE 8 — Admin Analytics Dashboard (Good-to-have)
[x] KPIs: revenue, AOV, orders, conversion proxy, top SKUs, low stock
[x] Charts: last 30 days revenue/orders; cohort by first-order week (optional)
[x] Abandoned carts (basic proxy: carts w/o order >24h)

## ADDITIONAL FEATURES IMPLEMENTED (Beyond Original Plan)

PHASE 9 — Enhanced Customer Experience
[x] Customer Account Management: Dashboard, profile, order history, wishlist
[x] Account Settings: Address book, preferences, account management
[x] Wishlist System: Save/remove products, wishlist sharing
[x] Product Reviews & Ratings: Customer feedback system
[x] Advanced Search: Faceted search with multiple filters

PHASE 10 — Advanced Admin Features  
[x] User Management: Admin user creation, role assignment, permission matrix
[x] Collections Management: Advanced collection organization with categories
[x] Inventory Management: Comprehensive stock tracking and management
[x] Export/Import: Bulk data operations for products and collections
[x] Advanced Media Library: Professional media organization with folders and tags

PHASE 11 — Marketing & Promotions
[x] Promotional Banners: Dynamic marketing content management
[x] Advanced Discount System: Complex discount rules and stacking
[x] Email Integration: Customer engagement and marketing
[x] Social Proof: Trust indicators and customer testimonials

PHASE 12 — Performance & Analytics (Recently Completed)
[x] Core Web Vitals Optimization: Performance monitoring and optimization
[x] Google Analytics 4 Integration: Comprehensive e-commerce tracking
[x] Facebook Pixel Integration: Marketing analytics and conversion tracking
[x] Structured Data (Schema.org): Advanced SEO optimization
[x] Progressive Web App (PWA): Offline support, service workers, push notifications
[x] Dynamic Sitemap & Robots.txt: SEO automation
[x] Advanced Caching Strategy: ISR, route segment caching, performance optimization
[x] Error Tracking & Performance Monitoring: Production monitoring setup

## Quality Gates (each PR)

[x] Typecheck & ESLint pass
[x] Unit tests for server actions & API route handlers (Vitest)
[ ] E2E happy-path (Playwright): PLP → PDP → cart → checkout (mock Razorpay) (when ready)
[x] Basic Lighthouse thresholds: desktop 95+, mobile 85+ (storefront pages)
[x] No secrets leaked to client bundles; env access reviewed

## Scripts

[x] dev: docker compose up -d; npm dev
[x] db: npm run drizzle:generate; npm run drizzle:migrate
[x] seed: npm run db:seed
[ ] test: pnpm vitest
[ ] e2e: pnpm playwright test

## Notes

- Money in minor units (INT).
- Idempotency keys for every write (cart ops, checkout, webhooks).
- Strict Zod validation for all server actions and route handlers.
- Accessibility: semantic HTML, ARIA where needed, keyboard navigation in admin tables.
  """
