# Phase 2: Storefront Core - Implementation Plan

## 🎯 **Objectives**

Build a modern, high-performance customer-facing e-commerce storefront with:

- Product browsing and search
- Shopping cart functionality
- SEO optimization
- Mobile-responsive design
- Server-side rendering for performance

## 📋 **Phase 2 Features Overview**

### **Core Shopping Experience**

- **Homepage**: Hero section, featured collections, promotional content
- **Product Listing (PLP)**: Collection pages with filtering and pagination
- **Product Detail (PDP)**: Product pages with variant selection
- **Shopping Cart**: Server-side cart with persistent state
- **SEO & Performance**: Dynamic metadata, ISR caching, optimized images

## 🏗️ **Implementation Roadmap**

### **Step 1: Routing & Layout Structure**

```
app/
├── (storefront)/
│   ├── layout.tsx                 # Storefront layout
│   ├── page.tsx                   # Homepage
│   ├── collections/
│   │   ├── [handle]/
│   │   │   └── page.tsx          # Collection PLP
│   │   └── page.tsx              # All collections
│   ├── products/
│   │   └── [handle]/
│   │       └── page.tsx          # Product PDP
│   ├── cart/
│   │   └── page.tsx              # Cart page
│   └── search/
│       └── page.tsx              # Search results
└── components/
    └── storefront/               # Storefront components
```

### **Step 2: Data Fetching & Server Actions**

```typescript
// lib/queries/products.ts
export async function getProductByHandle(handle: string)
export async function getCollectionProducts(
  handle: string,
  filters: ProductFilters
)
export async function getFeaturedProducts()

// lib/actions/cart.ts
export async function addToCart(
  productId: string,
  variantId: string,
  quantity: number
)
export async function updateCartItem(cartItemId: string, quantity: number)
export async function removeFromCart(cartItemId: string)
```

### **Step 3: Core Components**

- **ProductCard**: Grid/list display with images, pricing, quick actions
- **ProductGallery**: Image carousel with zoom functionality
- **VariantSelector**: Color/size/option selection with availability
- **CartDrawer**: Mini-cart with quick actions
- **FilterSidebar**: Product filtering for collections
- **Breadcrumbs**: Navigation context

### **Step 4: SEO & Performance**

- Dynamic metadata generation
- OpenGraph social sharing
- Structured data (JSON-LD)
- ISR caching strategy
- Image optimization
- Route segment caching

## 📁 **Detailed File Structure**

```
app/(storefront)/
├── layout.tsx                    # Main storefront layout
├── page.tsx                      # Homepage
├── loading.tsx                   # Loading UI
├── not-found.tsx                 # 404 page
├── collections/
│   ├── [handle]/
│   │   ├── page.tsx             # Collection detail page
│   │   ├── loading.tsx          # Collection loading
│   │   └── opengraph-image.tsx  # OG image generation
│   └── page.tsx                 # Collections overview
├── products/
│   └── [handle]/
│       ├── page.tsx             # Product detail page
│       ├── loading.tsx          # Product loading
│       └── opengraph-image.tsx  # Product OG image
├── cart/
│   ├── page.tsx                 # Full cart page
│   └── loading.tsx              # Cart loading
└── search/
    ├── page.tsx                 # Search results
    └── loading.tsx              # Search loading

components/storefront/
├── layout/
│   ├── Header.tsx               # Site header with nav
│   ├── Footer.tsx               # Site footer
│   ├── Navigation.tsx           # Main navigation
│   └── MobileNav.tsx            # Mobile navigation
├── product/
│   ├── ProductCard.tsx          # Product card component
│   ├── ProductGrid.tsx          # Product grid layout
│   ├── ProductGallery.tsx       # Image gallery with zoom
│   ├── VariantSelector.tsx      # Product variant selection
│   ├── ProductInfo.tsx          # Product details display
│   ├── AddToCartButton.tsx      # Add to cart functionality
│   └── ProductReviews.tsx       # Reviews display (future)
├── cart/
│   ├── CartDrawer.tsx           # Slide-out cart
│   ├── CartItem.tsx             # Individual cart item
│   ├── CartSummary.tsx          # Cart totals
│   └── MiniCart.tsx             # Header cart icon
├── collection/
│   ├── CollectionHeader.tsx     # Collection banner
│   ├── ProductFilters.tsx       # Filtering sidebar
│   ├── SortDropdown.tsx         # Sort options
│   └── Pagination.tsx           # Page navigation
├── common/
│   ├── Breadcrumbs.tsx          # Navigation breadcrumbs
│   ├── SearchBar.tsx            # Global search
│   ├── PriceDisplay.tsx         # Price formatting
│   ├── Badge.tsx                # Status badges
│   └── LoadingSpinner.tsx       # Loading states
└── home/
    ├── HeroSection.tsx          # Homepage hero
    ├── FeaturedProducts.tsx     # Featured product grid
    ├── CollectionShowcase.tsx   # Collection highlights
    └── PromoSection.tsx         # Promotional content

lib/
├── queries/
│   ├── products.ts              # Product data fetching
│   ├── collections.ts           # Collection queries
│   ├── cart.ts                  # Cart state queries
│   └── search.ts                # Search functionality
├── actions/
│   ├── cart.ts                  # Cart server actions
│   ├── products.ts              # Product actions
│   └── search.ts                # Search actions
├── utils/
│   ├── seo.ts                   # SEO utilities
│   ├── currency.ts              # Price formatting
│   ├── images.ts                # Image optimization
│   └── cart.ts                  # Cart utilities
└── types/
    ├── storefront.ts            # Storefront types
    ├── cart.ts                  # Cart types
    └── product.ts               # Product types
```

## 🎨 **Design System Integration**

### **shadcn/ui Components to Use**

- `Button` - CTA buttons, cart actions
- `Card` - Product cards, collection cards
- `Badge` - Sale tags, status indicators
- `Select` - Sort dropdowns, variant selection
- `Input` - Search bars, quantity inputs
- `Sheet` - Mobile menu, cart drawer
- `Breadcrumb` - Navigation breadcrumbs
- `Skeleton` - Loading states
- `Dialog` - Quick view modals
- `Tabs` - Product information sections

### **Custom Component Patterns**

```typescript
// ProductCard with consistent styling
<Card className="group hover:shadow-lg transition-shadow">
  <ProductImage />
  <CardContent>
    <ProductTitle />
    <PriceDisplay />
    <AddToCartButton />
  </CardContent>
</Card>

// Responsive grid layouts
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {products.map(product => <ProductCard key={product.id} product={product} />)}
</div>
```

## ⚡ **Performance Strategy**

### **Caching Strategy**

```typescript
// ISR for product pages
export const revalidate = 3600 // 1 hour

// Route segment caching for collections
export const dynamicParams = true
export const dynamic = 'force-static'

// Streaming for heavy components
<Suspense fallback={<ProductGridSkeleton />}>
  <ProductGrid />
</Suspense>
```

### **Image Optimization**

```typescript
// Next.js Image component with optimization
<Image
  src={product.featuredImage}
  alt={product.title}
  width={400}
  height={400}
  className="object-cover"
  priority={index < 4} // LCP optimization
  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
/>
```

## 🔍 **SEO Implementation**

### **Dynamic Metadata**

```typescript
// app/(storefront)/products/[handle]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductByHandle(params.handle)

  return {
    title: `${product.title} | Your Store`,
    description: product.description,
    openGraph: {
      title: product.title,
      description: product.description,
      images: [product.featuredImage],
      type: 'product',
    },
    other: {
      'product:price': product.price.toString(),
      'product:availability': product.availableForSale
        ? 'in stock'
        : 'out of stock',
    },
  }
}
```

### **Structured Data**

```typescript
// JSON-LD for products
const productStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.title,
  description: product.description,
  offers: {
    '@type': 'Offer',
    price: product.price / 100,
    priceCurrency: 'INR',
    availability: product.availableForSale ? 'InStock' : 'OutOfStock',
  },
}
```

## 🛒 **Cart Implementation**

### **Server-Side Cart Strategy**

```typescript
// Cookie-based cart persistence
export async function getCart(): Promise<Cart | null> {
  const cartId = cookies().get('cart_id')?.value
  if (!cartId) return null

  return await db.query.carts.findFirst({
    where: eq(carts.id, cartId),
    with: {
      items: {
        with: {
          variant: {
            with: {
              product: true,
            },
          },
        },
      },
    },
  })
}

// Server actions for cart management
export async function addToCart(variantId: string, quantity: number) {
  const cart = await getOrCreateCart()
  // Add optimistic UI updates
  // Validate inventory
  // Update cart in database
}
```

## 📱 **Responsive Design Priorities**

### **Mobile-First Approach**

- Touch-friendly buttons (min 44px)
- Swipeable product galleries
- Sticky cart button on product pages
- Collapsible filters on mobile
- Optimized image loading for mobile

### **Desktop Enhancements**

- Hover effects on product cards
- Sticky navigation
- Side-by-side layout for PDP
- Advanced filtering options
- Quick view modals

## 🧪 **Testing Strategy**

### **Component Testing**

```typescript
// ProductCard.test.tsx
test('displays product information correctly', () => {
  render(<ProductCard product={mockProduct} />)
  expect(screen.getByText(mockProduct.title)).toBeInTheDocument()
  expect(screen.getByText(formatPrice(mockProduct.price))).toBeInTheDocument()
})
```

### **E2E Testing Scenarios**

- Browse products → add to cart → view cart
- Filter products by category/price
- Search for products
- Product variant selection
- Mobile navigation flow

## 🚀 **Implementation Timeline**

### **Week 1: Foundation**

- [ ] Set up routing structure
- [ ] Create base layout components
- [ ] Implement basic data fetching

### **Week 2: Product Pages**

- [ ] Build product listing page
- [ ] Create product detail page
- [ ] Implement variant selection

### **Week 3: Cart & Navigation**

- [ ] Shopping cart functionality
- [ ] Navigation components
- [ ] Search implementation

### **Week 4: Polish & Performance**

- [ ] SEO optimization
- [ ] Performance tuning
- [ ] Mobile responsiveness
- [ ] Testing and bug fixes

## 🎯 **Success Metrics**

### **Performance Targets**

- **Desktop Lighthouse**: 95+ performance score
- **Mobile Lighthouse**: 85+ performance score
- **LCP**: < 2.5 seconds
- **FID**: < 100ms
- **CLS**: < 0.1

### **Functionality Targets**

- [ ] Product browsing with filtering
- [ ] Variant selection with inventory checking
- [ ] Persistent shopping cart
- [ ] Mobile-responsive design
- [ ] SEO-optimized pages
- [ ] Fast navigation and loading

## 🔧 **Development Tools & Setup**

### **Required Dependencies**

```bash
# Additional packages needed
npm install @tanstack/react-query zustand
npm install @next/third-parties  # For analytics later
npm install sharp              # Image optimization
```

### **Development Commands**

```bash
npm run dev                    # Start development server
npm run db:validate           # Validate database schema
npm run lint                  # Check code quality
npm run typecheck            # TypeScript validation
```

Ready to start building the storefront? Let me know which component you'd like to tackle first! 🚀
