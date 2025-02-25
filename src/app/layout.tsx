import { Metadata } from 'next'
import { Inter, Roboto_Slab, JetBrains_Mono } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from '@/components/toaster'
import { BasicAuthModal } from '@/components/auth/basic-auth-modal'
import MaterialFilters from '@/components/ui/MaterialFilters'
import { ThemeProvider } from '@/providers/theme-provider'
import './globals.css'

// Load fonts
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Remate Discos',
  description: 'Vinyl Collection Sale',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${robotoSlab.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <MaterialFilters />
          <Providers>
            <BasicAuthModal />
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}