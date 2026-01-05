import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Live DDoS Attack Map',
  description: 'Real-time global DDoS attack visualization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
