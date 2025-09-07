# E-Commerce Platform - Next.js 14

A modern, full-featured e-commerce platform built with Next.js 14, TypeScript, and Tailwind CSS. Features a Shopify-class storefront and powerful admin CMS.

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server Actions)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Icons**: Lucide React
- **Authentication**: NextAuth.js (Email OTP)
- **Database**: PostgreSQL (via Docker)
- **Cache**: Redis (via Docker)
- **Search**: Meilisearch (via Docker)
- **Email Testing**: Mailhog (via Docker)
- **Code Quality**: ESLint, Prettier, Husky, lint-staged

## Features

### Storefront

- 🏪 Home page with hero, featured products, and categories
- 🛍️ Product listing pages with filters
- 🔍 Full-text product search powered by Meilisearch
- 🛒 Shopping cart functionality
- 💳 Checkout with Razorpay integration (ready to implement)

### Admin Panel

- 🔐 Protected routes with role-based access control (RBAC)
- 📋 Dashboard with key metrics
- 📦 Product management (ready to implement)
- 📈 Order management (ready to implement)
- 👥 Customer management (ready to implement)
- 🏷️ Discount management (ready to implement)
- 📝 Content management (ready to implement)
- ⚙️ Settings management (ready to implement)

### Authentication & Security

- 📧 Email OTP authentication
- 👤 User roles: Admin, Manager, Staff, Customer
- 🔒 Permission-based access control
- 🎯 Protected admin routes

## Project Structure

```
├── app/
│   ├── (storefront)/     # Public storefront routes
│   ├── (admin)/          # Admin panel routes
│   ├── api/              # API routes
│   └── auth/             # Authentication pages
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── storefront/       # Storefront-specific components
│   └── admin/            # Admin-specific components
├── lib/                  # Utility functions and configurations
├── db/                   # Database schema and migrations
├── scripts/              # Maintenance and seed scripts
└── types/                # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Setup Instructions

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ecommerce-claude-3
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and update the following required variables:
   - `NEXTAUTH_SECRET`: Generate a secret using `openssl rand -base64 32`
   - `ADMIN_EMAIL`: Set your admin email address
   - Keep other defaults for local development

4. **Start Docker services**

   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL (port 5432)
   - Redis (port 6379)
   - Meilisearch (port 7700)
   - Mailhog (SMTP: 1025, Web UI: 8025)

5. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the storefront.

6. **Access different services**
   - Storefront: [http://localhost:3000](http://localhost:3000)
   - Admin Panel: [http://localhost:3000/admin](http://localhost:3000/admin)
   - Mailhog UI: [http://localhost:8025](http://localhost:8025)
   - Meilisearch UI: [http://localhost:7700](http://localhost:7700)

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Type checking
npm run typecheck

# Docker commands
docker-compose up -d    # Start all services
docker-compose down     # Stop all services
docker-compose logs -f  # View logs
docker-compose ps       # Check service status
```

## Authentication Flow

1. User enters email on sign-in page
2. System sends OTP code and magic link via email
3. User clicks link or enters OTP to authenticate
4. Session is created with JWT token
5. Admin users get additional permissions based on RBAC

## Admin Access

To access the admin panel:

1. Set `ADMIN_EMAIL` in your `.env` file
2. Sign in with that email address
3. Navigate to `/admin`

Only users with the admin role can access admin routes.

## Environment Variables

Key environment variables (see `.env.example` for full list):

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Application URL
- `NEXTAUTH_SECRET`: Secret for JWT encryption
- `REDIS_URL`: Redis connection string
- `MEILISEARCH_URL`: Meilisearch API URL
- `MEILISEARCH_MASTER_KEY`: Meilisearch master key
- `ADMIN_EMAIL`: Email address for admin access

## Docker Services

The `docker-compose.yml` includes:

- **PostgreSQL 15**: Main database
- **Redis 7**: Caching and session storage
- **Meilisearch**: Full-text search engine
- **Mailhog**: Email testing tool

All services use named volumes for data persistence.

## Code Quality

This project uses:

- **ESLint**: For code linting
- **Prettier**: For code formatting
- **Husky**: For Git hooks
- **lint-staged**: For pre-commit checks

Pre-commit hooks automatically run linting and formatting on staged files.

## Next Steps

Refer to `todos.md` for the complete implementation roadmap including:

- Database schema setup with Drizzle ORM
- Product and inventory management
- Order processing and fulfillment
- Payment integration with Razorpay
- Advanced search features
- Email notifications
- Analytics dashboard

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `npm run lint:fix` and `npm run format`
4. Commit your changes (Husky will run pre-commit checks)
5. Push to your branch
6. Create a pull request

## License

MIT License - see LICENSE file for details
