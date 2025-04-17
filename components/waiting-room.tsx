"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { PlayerRole } from "@/lib/types"
import { Check, Clock, Copy, AlertCircle, RefreshCw } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"

interface WaitingRoomProps {
  gameId: string
  players: Record<PlayerRole, string | null>
  currentRole: PlayerRole | null
  onStartGame: () => void
}

export function WaitingRoom({ gameId, players, currentRole, onStartGame }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [startTimeout, setStartTimeout] = useState<NodeJS.Timeout | null>(null)

  const copyGameId = () => {
    navigator.clipboard.writeText(gameId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const allRolesFilled = Object.values(players).every((player) => player !== null)

  const handleStartGame = async () => {
    setIsStarting(true)
    setStartError(null)

    // Set a timeout to detect if the game is taking too long to start
    const timeout = setTimeout(() => {
      setStartError(
        "Game start is taking longer than expected. The server might be busy or there could be a connection issue.",
      )
      setIsStarting(false)
    }, 10000) // 10 seconds timeout

    setStartTimeout(timeout)

    try {
      await onStartGame()
      // If successful, the game page will update via the realtime subscription
    } catch (error) {
      console.error("Error starting game:", error)
      setStartError(`Failed to start game: ${error instanceof Error ? error.message : String(error)}`)
      setIsStarting(false)

      if (startTimeout) {
        clearTimeout(startTimeout)
        setStartTimeout(null)
      }
    }
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (startTimeout) {
        clearTimeout(startTimeout)
      }
    }
  }, [startTimeout])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-md mx-auto border-sara-coral">
          <CardHeader>
            <CardTitle className="text-2xl text-sara-gold">Waiting for Players</CardTitle>
            <CardDescription>Share this game code with other players</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-md">
              <span className="font-mono text-lg">{gameId}</span>
              <Button variant="ghost" size="sm" onClick={copyGameId}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copy game code</span>
              </Button>
            </div>

            {startError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error Starting Game</p>
                  <p className="text-sm">{startError}</p>
                  <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => setStartError(null)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold">Players</h3>

              <div className="space-y-2">
                {(Object.keys(players) as PlayerRole[]).map((role) => (
                  <div
                    key={role}
                    className={`flex items-center justify-between p-3 rounded-md ${
                      players[role] ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"
                    } ${role === currentRole ? "ring-2 ring-sara-purple" : ""}`}
                  >
                    <div>
                      <span className="capitalize font-medium">{role}</span>
                      {role === currentRole && <span className="ml-2 text-xs text-sara-purple">(You)</span>}
                    </div>
                    <div className="flex items-center">
                      {players[role] ? (
                        <>
                          <Check className="h-4 w-4 text-green-500 mr-1" />
                          <span>{players[role]}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-gray-500">Waiting...</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              className="w-full bg-sara-purple hover:bg-opacity-90"
              disabled={!allRolesFilled || isStarting}
              onClick={handleStartGame}
            >
              {isStarting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Starting Game...
                </>
              ) : allRolesFilled ? (
                "Start Game"
              ) : (
                "Waiting for all players..."
              )}
            </Button>

            {isStarting && (
              <p className="text-sm text-gray-500 text-center">
                This may take a few moments. Please wait while the game initializes...
              </p>
            )}

            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full" disabled={isStarting}>
                Return to Home
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
