import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Minecraft Resource Pack Merger | Combine MC Server Textures",
  description: "A web-based tool for merging Minecraft resource packs, combine MC server textures, and manage multiple texture packs for your Minecraft server. Free online resource pack merger.",
  keywords: "merge resource packs, MC server textures, Minecraft server SEO, resource pack merger, minecraft textures, texture pack combiner",
  openGraph: {
    title: "Minecraft Resource Pack Merger | Combine MC Server Textures",
    description: "Merge Minecraft resource packs and combine MC server textures easily with our free online tool.",
    type: "website",
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}

