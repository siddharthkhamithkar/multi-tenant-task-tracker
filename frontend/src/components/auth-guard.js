"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/src/lib/auth"

export default function AuthGuard({ children }) {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        router.push("/login")
      } else {
        setIsLoading(false)
      }
    }

    const timer = setTimeout(checkAuth, 100)
    return () => clearTimeout(timer)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">TaskTracker</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    )
  }

  return children
}
