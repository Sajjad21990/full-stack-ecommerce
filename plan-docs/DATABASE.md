# Database Management Guide

This guide covers all database-related operations and improvements for the e-commerce platform.

## 🚀 Quick Start

```bash
# Validate environment and setup
npm run setup

# For fresh installation
npm run setup:fresh
```

## 📋 Available Scripts

### Database Operations

```bash
# Schema Management
npm run db:generate    # Generate Drizzle migrations
npm run db:push        # Push schema changes to database
npm run db:migrate     # Run migrations (recommended for production)
npm run db:studio      # Open Drizzle Studio GUI

# Data Seeding
npm run db:seed        # Original seed script
npm run db:seed-improved # Improved seed with transactions & error handling
npm run db:reset       # Reset schema + seed with improved script

# Validation & Diagnostics
npm run db:validate    # Validate database schema and data
npm run db:backup      # Create timestamped database backup
npm run db:restore     # Restore from backup (requires file path)
```

### Environment Management

```bash
npm run env:validate   # Validate environment variables
npm run env:template   # Generate .env.example template

# Combined Operations
npm run setup          # Validate env + db (non-destructive)
npm run setup:fresh    # Full fresh setup with reset
```

## 🔧 Improvements Implemented

### 1. Enhanced Environment Loading

- **File**: `drizzle.config.ts`
- **Improvements**:
  - Fallback environment loading (`.env.local` → `.env`)
  - Environment variable validation
  - Better error messages

### 2. Schema Validation Script

- **File**: `scripts/validate-schema.ts`
- **Features**:
  - Validates all 38+ required tables
  - Checks critical table columns
  - Validates database indexes
  - Verifies essential data existence
  - Comprehensive reporting

### 3. Improved Seed Script

- **File**: `scripts/seed-improved.ts`
- **Improvements**:
  - **Transaction Support**: All operations in single atomic transaction
  - **Better Error Handling**: Custom error types with specific handling
  - **Idempotent**: Safe to run multiple times
  - **Environment Validation**: Checks before execution
  - **Detailed Logging**: Better progress tracking

### 4. Environment Validation

- **File**: `scripts/validate-env.ts`
- **Features**:
  - Validates required vs optional variables
  - Format validation (URLs, etc.)
  - Production-specific checks
  - Generates `.env.example` template
  - Security recommendations

## 🗄️ Database Schema Overview

### Core Tables (38 total)

- **Auth**: users, roles, permissions, user_roles, role_permissions
- **NextAuth**: accounts, sessions, verification_tokens
- **Customers**: customers, addresses
- **Products**: products, product_options, option_values, product_variants
- **Catalog**: collections, product_collections, categories, product_categories
- **Inventory**: inventory_locations, stock_levels
- **Orders**: carts, cart_items, orders, order_items, payments, refunds
- **Fulfillment**: shipments, returns
- **Pricing**: discounts, gift_cards, tax_zones, tax_rates, shipping_zones, shipping_rates
- **System**: media_assets, metafields, webhooks, audit_logs

## 🛡️ Error Handling

The improved seed script handles common database errors:

- **23505** (Unique Constraint): Gracefully handles duplicates
- **23503** (Foreign Key): Clear foreign key violation messages
- **42P01** (Missing Table): Suggests running schema migration
- **Connection Errors**: Environment validation guidance

## 🔒 Security Best Practices

1. **Password Hashing**: bcrypt with 12 salt rounds (increased from 10)
2. **Environment Variables**: Validation and format checking
3. **Database Credentials**: Never logged or exposed
4. **Transaction Safety**: Atomic operations prevent partial state

## 📊 Validation Reports

### Environment Validation

```bash
📊 ENVIRONMENT VALIDATION REPORT
===================================
Environment: development
Required Variables: ✅ PASS
Database URL: ✅ VALID
Optional Variables: 0 warnings
Production Ready: ✅ YES
```

### Schema Validation

```bash
📊 VALIDATION REPORT
==================
Database Connection: ✅ PASS
Table Structure: ✅ PASS
Column Validation: ✅ PASS
Index Validation: ✅ PASS
Data Validation: ✅ PASS
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**

   ```bash
   # Check Docker services
   docker-compose ps

   # Restart if needed
   docker-compose up -d

   # Validate environment
   npm run env:validate
   ```

2. **Schema Out of Sync**

   ```bash
   # Reset schema
   npm run db:reset
   ```

3. **Missing Environment Variables**

   ```bash
   # Generate template
   npm run env:template

   # Copy and modify
   cp .env.example .env
   ```

4. **Permission Errors**
   ```bash
   # Ensure Docker has correct permissions
   docker-compose down
   docker-compose up -d
   ```

## 🎯 Production Deployment

### Pre-deployment Checklist

```bash
# 1. Validate production environment
NODE_ENV=production npm run env:validate

# 2. Use migrations instead of push
npm run db:generate
npm run db:migrate

# 3. Validate schema
npm run db:validate

# 4. Create backup
npm run db:backup
```

### Production Environment Variables

- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
- `RESEND_API_KEY` for emails
- `FIREBASE_*` for file storage
- Proper `DATABASE_URL` (not localhost)

## 📈 Performance Considerations

1. **Indexes**: All critical indexes are validated
2. **Transactions**: Atomic operations for data consistency
3. **Connection Pooling**: Configured in Drizzle setup
4. **Query Optimization**: Uses prepared statements

## 🔄 Migration vs Push

### Development (Current)

```bash
npm run db:push  # Direct schema changes
```

### Production (Recommended)

```bash
npm run db:generate  # Create migration files
npm run db:migrate   # Apply migrations
```

Migration files provide:

- Version control for schema changes
- Rollback capabilities
- Production safety
- Team collaboration

## 📚 Next Steps

With these improvements, your database setup is now:

- ✅ **Robust**: Transaction support and error handling
- ✅ **Validated**: Comprehensive validation scripts
- ✅ **Documented**: Clear operations and troubleshooting
- ✅ **Production-Ready**: Migration support and security best practices

Ready to proceed with **Phase 2: Storefront Core** development!
