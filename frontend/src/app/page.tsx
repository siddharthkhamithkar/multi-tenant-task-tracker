"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/src/lib/auth"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated()) {
        router.push("/organizations")
      } else {
        router.push("/login")
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">TaskTracker</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading your workspace...</p>
      </div>
    </div>
  )
}
