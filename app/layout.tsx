import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ConditionalLayout } from "@/components/shared/conditional-layout"
import { AuthProvider } from "@/lib/contexts/auth"
import { ThemeProvider } from "@/lib/contexts/theme"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FanForge - Create with Official Brand Assets",
  description:
    "Collaborative platform for sanctioned derivative content creation. Connect with brands and create amazing artwork using official assets.",
  keywords: ["fan art", "brand collaboration", "creative platform", "official assets"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress browser extension connection errors
              window.addEventListener('error', function(e) {
                if (e.message && e.message.includes('Could not establish connection')) {
                  e.preventDefault();
                  return false;
                }
              });
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system" storageKey="fanforge-ui-theme">
          <AuthProvider>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}