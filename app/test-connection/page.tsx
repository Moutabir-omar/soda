"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TestConnectionPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [details, setDetails] = useState<any>(null)

  const testConnection = async () => {
    setStatus("loading")
    setMessage("Testing connection to Supabase...")

    try {
      // Test basic connection
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        throw error
      }

      // Try to query the games table
      const { data: games, error: gamesError } = await supabase.from("games").select("id, game_code").limit(5)

      if (gamesError) {
        throw gamesError
      }

      setStatus("success")
      setMessage("Successfully connected to Supabase and queried the games table")
      setDetails({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Not set",
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set (hidden)" : "Not set",
        games: games || [],
      })
    } catch (error) {
      console.error("Connection test failed:", error)
      setStatus("error")
      setMessage(`Connection failed: ${error instanceof Error ? error.message : String(error)}`)
      setDetails(error)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4 flex items-center justify-center">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-sara-gold">Supabase Connection Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`p-4 rounded-md mb-4 ${
              status === "loading"
                ? "bg-blue-50 text-blue-800"
                : status === "success"
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
            }`}
          >
            <p className="font-medium">{message}</p>
          </div>

          {details && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Details:</h3>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-64 text-sm">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              onClick={testConnection}
              disabled={status === "loading"}
              className="bg-sara-purple hover:bg-opacity-90"
            >
              {status === "loading" ? "Testing..." : "Test Again"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
