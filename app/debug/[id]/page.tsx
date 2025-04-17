"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Loader2, RefreshCw } from "lucide-react"

export default function GameDebugPage() {
  const params = useParams()
  const gameId = params.id as string

  const [gameData, setGameData] = useState<any>(null)
  const [playersData, setPlayersData] = useState<any[]>([])
  const [ordersData, setOrdersData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFixing, setIsFixing] = useState(false)

  const loadGameData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Try to get the game by ID first
      const { data: gameById, error: gameByIdError } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single()

      if (gameByIdError && gameByIdError.code !== "PGRST116") {
        throw gameByIdError
      }

      // If not found by ID, try by game code
      let game = gameById
      if (!game) {
        const { data: gameByCode, error: gameByCodeError } = await supabase
          .from("games")
          .select("*")
          .eq("game_code", gameId)
          .single()

        if (gameByCodeError && gameByCodeError.code !== "PGRST116") {
          throw gameByCodeError
        }

        game = gameByCode
      }

      if (!game) {
        setError(`Game with ID or code ${gameId} not found`)
        setIsLoading(false)
        return
      }

      setGameData(game)

      // Get players
      const { data: players, error: playersError } = await supabase.from("players").select("*").eq("game_id", game.id)

      if (playersError) {
        throw playersError
      }

      setPlayersData(players || [])

      // Get orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("game_id", game.id)
        .order("week_placed", { ascending: false })
        .limit(20)

      if (ordersError) {
        throw ordersError
      }

      setOrdersData(orders || [])

      setIsLoading(false)
    } catch (err) {
      console.error("Error loading game data:", err)
      setError(`Error loading game data: ${err instanceof Error ? err.message : String(err)}`)
      setIsLoading(false)
    }
  }

  const fixGameState = async () => {
    if (!gameData) return

    setIsFixing(true)
    try {
      // Update game status to active if it's stuck in waiting
      if (gameData.status === "waiting") {
        await supabase.from("games").update({ status: "active" }).eq("id", gameData.id)

        alert("Game status updated to active")
      } else {
        alert("Game is not in waiting state, no fix needed")
      }

      // Reload data
      await loadGameData()
    } catch (err) {
      console.error("Error fixing game:", err)
      alert(`Error fixing game: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsFixing(false)
    }
  }

  useEffect(() => {
    loadGameData()
  }, [gameId])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-sara-gold">Game Debug: {gameId}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadGameData} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            <Link href="/">
              <Button variant="outline">Return Home</Button>
            </Link>
          </div>
        </div>

        {error ? (
          <Card className="mb-4 border-red-300">
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-sara-purple" />
          </div>
        ) : (
          <>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Game Information</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fixGameState}
                    disabled={isFixing || gameData?.status !== "waiting"}
                  >
                    {isFixing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Fix Game State
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">ID:</h3>
                    <p className="font-mono text-sm">{gameData?.id}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Game Code:</h3>
                    <p className="font-mono text-sm">{gameData?.game_code}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Status:</h3>
                    <p
                      className={`font-medium ${
                        gameData?.status === "waiting"
                          ? "text-yellow-600"
                          : gameData?.status === "active"
                            ? "text-green-600"
                            : gameData?.status === "completed"
                              ? "text-blue-600"
                              : ""
                      }`}
                    >
                      {gameData?.status}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Week:</h3>
                    <p>
                      {gameData?.current_week} of {gameData?.total_weeks}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Created At:</h3>
                    <p>{new Date(gameData?.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Updated At:</h3>
                    <p>{new Date(gameData?.updated_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="font-semibold">Game URL:</h3>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/game/${gameData?.id}`}
                      className="flex-1 p-2 border rounded text-sm font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/game/${gameData?.id}`)
                        alert("Game URL copied to clipboard")
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <Link href={`/game/${gameData?.id}`}>
                    <Button className="w-full bg-sara-purple">Go to Game</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Players ({playersData.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {playersData.length === 0 ? (
                    <p className="text-gray-500">No players found</p>
                  ) : (
                    <div className="space-y-4">
                      {playersData.map((player) => (
                        <div key={player.id} className="p-3 border rounded">
                          <div className="flex justify-between">
                            <span className="font-semibold capitalize">{player.role}</span>
                            <span className={player.is_ai ? "text-orange-600" : "text-green-600"}>
                              {player.is_ai ? "AI" : "Human"}
                            </span>
                          </div>
                          <div className="mt-1">
                            <span className="text-gray-600">Name:</span> {player.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders ({ordersData.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersData.length === 0 ? (
                    <p className="text-gray-500">No orders found</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-auto">
                      {ordersData.map((order) => (
                        <div key={order.id} className="p-2 border rounded text-sm">
                          <div className="flex justify-between">
                            <span>
                              <span className="font-medium capitalize">{order.from_role}</span> →
                              <span className="capitalize"> {order.to_role}</span>
                            </span>
                            <span className="text-gray-600">
                              Week {order.week_placed} → {order.week_delivered}
                            </span>
                          </div>
                          <div className="mt-1 flex justify-between">
                            <span>Quantity: {order.quantity}</span>
                            <span className={order.is_delivered ? "text-green-600" : "text-orange-600"}>
                              {order.is_delivered ? "Delivered" : "Pending"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
