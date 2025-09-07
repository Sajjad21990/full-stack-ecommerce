import { Header } from '@/components/storefront/layout/header'
import { Footer } from '@/components/storefront/layout/footer'

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}