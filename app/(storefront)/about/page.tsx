import { Breadcrumbs } from '@/components/storefront/common/breadcrumbs'

export const metadata = {
  title: 'About Us | Shop',
  description: 'Learn more about our story and mission',
}

export default function AboutPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'About Us' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} className="mb-6" />
        
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">About Us</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Welcome to our store! We're passionate about bringing you the best products 
              at competitive prices. Our journey began with a simple idea: make quality 
              products accessible to everyone.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
            <p className="text-gray-600 mb-6">
              We strive to provide an exceptional shopping experience by offering a 
              carefully curated selection of products, outstanding customer service, 
              and fast, reliable shipping.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Why Choose Us?</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
              <li>Premium quality products</li>
              <li>Competitive pricing</li>
              <li>Fast and secure shipping</li>
              <li>30-day return policy</li>
              <li>24/7 customer support</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">Quality</h3>
                <p className="text-gray-600 text-sm">
                  We never compromise on the quality of our products.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">Trust</h3>
                <p className="text-gray-600 text-sm">
                  Building lasting relationships with our customers.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">Innovation</h3>
                <p className="text-gray-600 text-sm">
                  Continuously improving our services and offerings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}