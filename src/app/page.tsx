import Image from 'next/image'
import { useAuthStore } from '@/lib/auth/hooks'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8 max-w-5xl w-full text-center">
        <h1 className="text-4xl font-bold">Remate Discos</h1>
        <p className="text-lg text-muted-foreground">
          Browse the collection once authenticated
        </p>
      </div>
    </main>
  )
}