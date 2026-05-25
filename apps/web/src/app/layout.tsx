import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from "../components/theme-provider"

const display = Inter({ subsets: ["latin"], weight: ["400", "700", "900"], variable: "--font-display" })
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "YouTube Watch Later Kanban",
  description: "Manage your YouTube watch later videos in a Kanban board",
  icons: {
    icon: [
      { url: './favicon.ico' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <head>
        <link rel="icon" href="./favicon.ico" />
        <link rel="shortcut icon" href="./favicon.ico" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}