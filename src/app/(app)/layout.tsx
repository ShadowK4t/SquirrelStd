import Navbar from '@/components/navbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sq-bg">
      <Navbar />
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}
