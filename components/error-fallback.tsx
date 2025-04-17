"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

interface ErrorFallbackProps {
  error?: Error | string
  resetErrorBoundary?: () => void
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const errorMessage = error instanceof Error ? error.message : String(error || "Unknown error")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-purple-50 p-4">
      <Card className="max-w-md w-full border-sara-coral">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <CardTitle className="text-xl text-sara-gold">Something went wrong</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4">We encountered an error while loading the game:</p>
          <div className="bg-red-50 p-3 rounded-md border border-red-200 text-red-800 mb-4 overflow-auto max-h-32">
            {errorMessage}
          </div>
          <p>Please try again or return to the home page.</p>
        </CardContent>
        <CardFooter className="flex gap-4 justify-between">
          <Button variant="outline" onClick={resetErrorBoundary} className="flex-1">
            Try Again
          </Button>
          <Link href="/" className="flex-1">
            <Button className="w-full bg-sara-purple hover:bg-opacity-90">Return Home</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
