# Phase 3: Admin Products & Media - Implementation Plan

## 🎯 **Objectives**

Build a comprehensive admin dashboard for e-commerce management with:

- Product creation and editing interface
- Media upload and organization system
- Role-based access control (RBAC)
- Audit logging for all admin actions
- Modern, responsive admin UI

## 📋 **Phase 3 Features Overview**

### **Admin Core**

- **Admin Shell**: Navigation, layout, role-based guards
- **Dashboard**: KPIs, recent activity, quick actions
- **Product Management**: Full CRUD with variants, options, inventory
- **Media System**: Image upload, organization, gallery management
- **User Management**: Admin users, roles, permissions
- **Audit Logs**: Track all admin actions with full context

## 🏗️ **Implementation Roadmap**

### **Step 1: Admin Shell & Authentication**

- Admin layout with sidebar navigation
- RBAC middleware and route protection
- User session management
- Permission-based UI rendering

### **Step 2: Product Management Core**

- Products list with search, filters, bulk actions
- Product create/edit forms with validation
- Variant management interface
- Inventory tracking

### **Step 3: Media Management**

- Image upload with Firebase integration
- Media library with organization
- Product gallery management
- Image optimization and variants

### **Step 4: Advanced Features**

- Publishing workflow (draft/published)
- Audit logging system
- Bulk operations
- Export/import functionality

## 📁 **Detailed File Structure**

```
app/(admin)/
├── layout.tsx                   # Admin layout with sidebar
├── page.tsx                     # Admin dashboard
├── loading.tsx                  # Admin loading UI
├── products/
│   ├── page.tsx                 # Products list
│   ├── create/
│   │   └── page.tsx             # Create product
│   ├── [id]/
│   │   ├── page.tsx             # Edit product
│   │   ├── variants/
│   │   │   └── page.tsx         # Manage variants
│   │   └── media/
│   │       └── page.tsx         # Product media
│   └── bulk/
│       └── page.tsx             # Bulk operations
├── media/
│   ├── page.tsx                 # Media library
│   └── upload/
│       └── page.tsx             # Upload interface
├── users/
│   ├── page.tsx                 # User management
│   └── [id]/
│       └── page.tsx             # Edit user
├── settings/
│   ├── page.tsx                 # General settings
│   ├── roles/
│   │   └── page.tsx             # Role management
│   └── audit/
│       └── page.tsx             # Audit logs
└── api/
    ├── products/
    │   ├── route.ts             # Products API
    │   └── [id]/
    │       └── route.ts         # Single product API
    ├── media/
    │   ├── upload/
    │   │   └── route.ts         # File upload
    │   └── [id]/
    │       └── route.ts         # Media management
    └── audit/
        └── route.ts             # Audit logging API

components/admin/
├── layout/
│   ├── AdminLayout.tsx          # Main admin wrapper
│   ├── Sidebar.tsx              # Navigation sidebar
│   ├── Header.tsx               # Admin header with user menu
│   ├── Breadcrumbs.tsx          # Navigation breadcrumbs
│   └── MobileSidebar.tsx        # Mobile responsive nav
├── dashboard/
│   ├── StatsCards.tsx           # KPI cards
│   ├── RecentActivity.tsx       # Activity feed
│   ├── QuickActions.tsx         # Action shortcuts
│   └── Charts.tsx               # Analytics charts
├── products/
│   ├── ProductsList.tsx         # Products table
│   ├── ProductsFilters.tsx      # Search and filters
│   ├── ProductForm.tsx          # Create/edit form
│   ├── VariantManager.tsx       # Variant management
│   ├── InventoryTracker.tsx     # Stock levels
│   ├── ProductStatus.tsx        # Publishing status
│   ├── BulkActions.tsx          # Bulk operations
│   └── ProductPreview.tsx       # Live preview
├── media/
│   ├── MediaLibrary.tsx         # File browser
│   ├── MediaUpload.tsx          # Drag & drop upload
│   ├── MediaCard.tsx            # File card display
│   ├── MediaGallery.tsx         # Product image gallery
│   ├── ImageCropper.tsx         # Image editing
│   └── MediaFilters.tsx         # File organization
├── users/
│   ├── UsersList.tsx            # Users table
│   ├── UserForm.tsx             # User creation/editing
│   ├── RoleSelector.tsx         # Role assignment
│   └── PermissionMatrix.tsx     # Permission management
├── common/
│   ├── DataTable.tsx            # Reusable table component
│   ├── SearchInput.tsx          # Global search
│   ├── StatusBadge.tsx          # Status indicators
│   ├── ActionButtons.tsx        # CRUD action buttons
│   ├── ConfirmDialog.tsx        # Confirmation modals
│   ├── LoadingStates.tsx        # Various loading UI
│   └── EmptyState.tsx           # Empty list states
└── forms/
    ├── FormField.tsx            # Reusable form fields
    ├── RichTextEditor.tsx       # Product descriptions
    ├── ImageUploader.tsx        # Image upload widget
    ├── VariantBuilder.tsx       # Options/variants builder
    └── FormValidation.tsx       # Zod validation helpers

lib/admin/
├── permissions.ts               # RBAC utilities
├── audit.ts                    # Audit logging
├── validation.ts               # Form schemas
├── queries/
│   ├── products.ts             # Product data queries
│   ├── media.ts                # Media queries
│   ├── users.ts                # User management
│   └── audit.ts                # Audit log queries
├── actions/
│   ├── products.ts             # Product server actions
│   ├── media.ts                # Media server actions
│   ├── users.ts                # User server actions
│   └── audit.ts                # Audit server actions
└── utils/
    ├── upload.ts               # File upload utilities
    ├── image.ts                # Image processing
    ├── export.ts               # Data export
    └── notifications.ts        # Toast notifications
```

## 🛡️ **RBAC Implementation**

### **Permission Structure**

```typescript
// lib/admin/permissions.ts
export const PERMISSIONS = {
  PRODUCTS: {
    CREATE: 'products:create',
    READ: 'products:read',
    UPDATE: 'products:update',
    DELETE: 'products:delete',
    PUBLISH: 'products:publish',
  },
  MEDIA: {
    UPLOAD: 'media:upload',
    DELETE: 'media:delete',
    ORGANIZE: 'media:organize',
  },
  USERS: {
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
    MANAGE_ROLES: 'users:manage_roles',
  },
  SETTINGS: {
    UPDATE: 'settings:update',
    VIEW_AUDIT: 'settings:view_audit',
  },
} as const
```

### **Role-Based Guards**

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.redirect('/auth/signin')
    }

    // Check admin role
    if (!hasPermission(session.user, 'admin:access')) {
      return NextResponse.redirect('/unauthorized')
    }
  }
}

// Component-level guards
export function RequirePermission({
  permission,
  children,
  fallback
}: RequirePermissionProps) {
  const { user } = useSession()

  if (!hasPermission(user, permission)) {
    return fallback || <UnauthorizedMessage />
  }

  return children
}
```

## 🎨 **Admin UI Design System**

### **Layout Strategy**

```typescript
// AdminLayout.tsx - Responsive sidebar layout
<div className="flex h-screen bg-gray-50">
  <Sidebar className="hidden lg:flex" />
  <MobileSidebar className="lg:hidden" />

  <main className="flex-1 flex flex-col overflow-hidden">
    <Header />
    <div className="flex-1 overflow-auto p-6">
      <Breadcrumbs />
      {children}
    </div>
  </main>
</div>
```

### **Component Patterns**

```typescript
// DataTable with actions
<DataTable
  data={products}
  columns={[
    { key: 'title', label: 'Product Name', sortable: true },
    { key: 'status', label: 'Status', render: StatusBadge },
    { key: 'price', label: 'Price', render: formatPrice },
    { key: 'inventory', label: 'Stock', render: InventoryBadge },
    { key: 'actions', label: '', render: ActionButtons }
  ]}
  searchable
  filterable
  bulkActions={['publish', 'unpublish', 'delete']}
/>

// Form with validation
<Form {...form}>
  <FormField
    name="title"
    label="Product Title"
    placeholder="Enter product title"
    required
  />
  <FormField
    name="description"
    label="Description"
    component={RichTextEditor}
  />
  <FormField
    name="price"
    label="Price"
    type="number"
    prefix="₹"
  />
</Form>
```

## 📊 **Product Management Features**

### **Products List Interface**

- **Search & Filters**: Title, status, category, price range, inventory
- **Bulk Actions**: Publish/unpublish, delete, export, update inventory
- **Sort Options**: Name, price, created date, stock level
- **Views**: Grid view for visual browsing, table for detailed management
- **Pagination**: Server-side pagination with configurable page sizes

### **Product Editor**

```typescript
// Product form structure
interface ProductFormData {
  // Basic Info
  title: string
  handle: string
  description: string
  status: 'draft' | 'active' | 'archived'

  // Pricing
  price: number
  compareAtPrice?: number

  // Organization
  productType: string
  vendor: string
  tags: string[]
  collections: string[]
  categories: string[]

  // SEO
  seoTitle?: string
  seoDescription?: string

  // Options & Variants
  options: ProductOption[]
  variants: ProductVariant[]

  // Media
  images: MediaAsset[]
  featuredImage?: string

  // Inventory
  trackQuantity: boolean
  inventoryQuantity?: number
  allowBackorder: boolean
}
```

### **Variant Management**

```typescript
// Smart variant generation
const VariantBuilder = () => {
  const [options, setOptions] = useState<ProductOption[]>([])

  // Auto-generate variants from options
  const variants = useMemo(() => {
    return generateVariantCombinations(options).map(combination => ({
      id: createId(),
      title: combination.join(' / '),
      price: basePrice,
      sku: generateSKU(combination),
      inventoryQuantity: 0,
      options: combination
    }))
  }, [options])

  return (
    <div className="space-y-6">
      <OptionsEditor options={options} onChange={setOptions} />
      <VariantsTable variants={variants} onUpdate={updateVariant} />
    </div>
  )
}
```

## 🖼️ **Media Management System**

### **Firebase Storage Integration**

```typescript
// lib/admin/utils/upload.ts
export async function uploadImage(file: File): Promise<MediaAsset> {
  const storage = getStorage()
  const fileName = `products/${createId()}-${file.name}`
  const storageRef = ref(storage, fileName)

  // Upload with metadata
  const metadata = {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      uploadedBy: session.user.id,
      uploadedAt: new Date().toISOString(),
    },
  }

  const snapshot = await uploadBytes(storageRef, file, metadata)
  const downloadURL = await getDownloadURL(snapshot.ref)

  // Create database record
  const mediaAsset = await db
    .insert(mediaAssets)
    .values({
      id: createId(),
      fileName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: downloadURL,
      alt: '',
      uploadedBy: session.user.id,
    })
    .returning()

  return mediaAsset[0]
}
```

### **Media Library Interface**

- **Drag & Drop Upload**: Multiple files with progress tracking
- **Organization**: Folders, tags, bulk operations
- **Search & Filter**: By name, type, size, date, uploader
- **Image Editing**: Crop, resize, alt text, SEO optimization
- **Usage Tracking**: See which products use each image

## 📝 **Audit Logging System**

### **Comprehensive Activity Tracking**

```typescript
// lib/admin/audit.ts
export async function logAdminAction(action: AuditAction) {
  await db.insert(auditLogs).values({
    id: createId(),
    userId: action.userId,
    action: action.type,
    resourceType: action.resourceType,
    resourceId: action.resourceId,
    changes: action.changes,
    ipAddress: action.ipAddress,
    userAgent: action.userAgent,
    timestamp: new Date(),
  })
}

// Usage in server actions
export async function updateProduct(id: string, data: ProductFormData) {
  const oldProduct = await getProduct(id)
  const updatedProduct = await db
    .update(products)
    .set(data)
    .where(eq(products.id, id))
    .returning()

  // Log the change
  await logAdminAction({
    userId: session.user.id,
    type: 'PRODUCT_UPDATED',
    resourceType: 'product',
    resourceId: id,
    changes: {
      before: oldProduct,
      after: updatedProduct[0],
    },
    ipAddress: getClientIP(),
    userAgent: headers().get('user-agent'),
  })

  return updatedProduct[0]
}
```

## 🚀 **Performance & UX Optimizations**

### **Optimistic Updates**

```typescript
// Immediate UI feedback for actions
const deleteProduct = async (id: string) => {
  // Optimistically remove from UI
  setProducts((prev) => prev.filter((p) => p.id !== id))

  try {
    await deleteProductAction(id)
    toast.success('Product deleted successfully')
  } catch (error) {
    // Revert optimistic update
    setProducts(prevProducts)
    toast.error('Failed to delete product')
  }
}
```

### **Smart Loading States**

```typescript
// Skeleton loading for better UX
{loading ? (
  <ProductsListSkeleton />
) : (
  <ProductsList products={products} />
)}

// Suspense boundaries for progressive loading
<Suspense fallback={<DashboardSkeleton />}>
  <DashboardStats />
</Suspense>
```

### **Efficient Data Fetching**

```typescript
// Server-side pagination and filtering
export async function getProducts({
  page = 1,
  limit = 20,
  search,
  status,
  category,
}: ProductsQuery) {
  let query = db.select().from(products)

  if (search) {
    query = query.where(ilike(products.title, `%${search}%`))
  }

  if (status) {
    query = query.where(eq(products.status, status))
  }

  const [data, total] = await Promise.all([
    query.limit(limit).offset((page - 1) * limit),
    db.select({ count: sql`count(*)` }).from(products),
  ])

  return {
    products: data,
    pagination: {
      page,
      limit,
      total: total[0].count,
      pages: Math.ceil(total[0].count / limit),
    },
  }
}
```

## 🧪 **Testing Strategy**

### **Component Testing**

```typescript
// ProductForm.test.tsx
describe('ProductForm', () => {
  test('validates required fields', async () => {
    render(<ProductForm />)

    fireEvent.click(screen.getByText('Save Product'))

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument()
      expect(screen.getByText('Price is required')).toBeInTheDocument()
    })
  })

  test('submits form with valid data', async () => {
    const mockSubmit = jest.fn()
    render(<ProductForm onSubmit={mockSubmit} />)

    await userEvent.type(screen.getByLabelText('Product Title'), 'Test Product')
    await userEvent.type(screen.getByLabelText('Price'), '999')

    fireEvent.click(screen.getByText('Save Product'))

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Product',
        price: 99900 // In minor units
      }))
    })
  })
})
```

### **E2E Testing Scenarios**

- Login as admin → create product → publish → verify in database
- Upload multiple images → organize in library → assign to product
- Bulk operations: select multiple products → publish/delete
- Role-based access: staff user cannot access settings
- Audit trail: perform action → verify log entry

## 📈 **Success Metrics**

### **Functionality Targets**

- [ ] Complete product CRUD with variants
- [ ] Media upload and organization system
- [ ] Role-based access control working
- [ ] Audit logging for all actions
- [ ] Responsive admin interface
- [ ] Search and filtering in all list views
- [ ] Bulk operations for efficiency

### **Performance Targets**

- **Page Load Time**: < 2 seconds for admin pages
- **Form Submission**: < 500ms response time
- **Image Upload**: Progress tracking + compression
- **Search Response**: < 300ms for product search
- **Bulk Operations**: Handle 100+ items efficiently

## 🔧 **Implementation Timeline**

### **Week 1: Foundation**

- [ ] Admin layout and navigation
- [ ] RBAC middleware and guards
- [ ] Basic dashboard

### **Week 2: Product Management**

- [ ] Products list with search/filters
- [ ] Product create/edit forms
- [ ] Variant management system

### **Week 3: Media & Advanced**

- [ ] Media upload and library
- [ ] Image management for products
- [ ] Publishing workflow

### **Week 4: Polish & Features**

- [ ] Audit logging system
- [ ] Bulk operations
- [ ] User management
- [ ] Testing and refinement

## 🎯 **Ready to Start Building!**

With this comprehensive plan, you'll have a powerful admin system that provides:

✅ **Full Product Management** - Create, edit, organize products with variants  
✅ **Professional Media System** - Upload, organize, and optimize images  
✅ **Enterprise RBAC** - Secure role-based access control  
✅ **Complete Audit Trail** - Track every admin action  
✅ **Modern Admin UX** - Responsive, intuitive interface

**Which component would you like to start with?**

1. **🏗️ Admin shell and navigation** - Foundation first
2. **📊 Products list interface** - Core functionality
3. **🛡️ RBAC guards and middleware** - Security first
4. **🖼️ Media upload system** - Visual content management

Let's build this admin powerhouse! 🚀
