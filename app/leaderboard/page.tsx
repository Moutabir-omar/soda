"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Trophy, Users, ArrowLeft } from "lucide-react"

interface LeaderboardEntry {
  game_code: string
  team_cost: number
  player_name: string
  role: string
  player_cost: number
  created_at: string
}

export default function LeaderboardPage() {
  const [teamLeaderboard, setTeamLeaderboard] = useState<LeaderboardEntry[]>([])
  const [playerLeaderboard, setPlayerLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        // Fetch completed games for team leaderboard
        const { data: teamData, error: teamError } = await supabase
          .from("games")
          .select("game_code, total_team_cost, created_at")
          .eq("status", "completed")
          .order("total_team_cost", { ascending: true })
          .limit(10)

        if (teamError) throw teamError

        // Fetch player data for individual leaderboard
        const { data: playerData, error: playerError } = await supabase
          .from("players")
          .select("name, role, total_cost, game_id")
          .eq("is_ai", false)
          .order("total_cost", { ascending: true })
          .limit(20)

        if (playerError) throw playerError

        // Get game details for player leaderboard
        if (playerData.length > 0) {
          const gameIds = [...new Set(playerData.map((p) => p.game_id))]
          const { data: gameData, error: gameError } = await supabase
            .from("games")
            .select("id, game_code, total_team_cost, created_at")
            .in("id", gameIds)
            .eq("status", "completed")

          if (gameError) throw gameError

          // Combine player and game data
          const combinedPlayerData = playerData.map((player) => {
            const game = gameData.find((g) => g.id === player.game_id)
            return {
              game_code: game?.game_code || "Unknown",
              team_cost: game?.total_team_cost || 0,
              player_name: player.name,
              role: player.role,
              player_cost: player.total_cost,
              created_at: game?.created_at || "",
            }
          })

          setPlayerLeaderboard(combinedPlayerData.sort((a, b) => a.player_cost - b.player_cost).slice(0, 10))
        }

        // Format team leaderboard data
        const formattedTeamData = teamData.map((game) => ({
          game_code: game.game_code,
          team_cost: game.total_team_cost,
          player_name: "",
          role: "",
          player_cost: 0,
          created_at: game.created_at,
        }))

        setTeamLeaderboard(formattedTeamData)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching leaderboard:", error)
        setIsLoading(false)
      }
    }

    fetchLeaderboard()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-purple-900 mb-4">Soda Distribution Game Leaderboard</h1>
            <p className="text-lg text-gray-600">See the best performing teams and players</p>
          </div>

          <Tabs defaultValue="teams">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="teams" className="flex items-center">
                <Trophy className="mr-2 h-4 w-4" />
                Team Rankings
              </TabsTrigger>
              <TabsTrigger value="players" className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Individual Rankings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="teams">
              <Card>
                <CardHeader>
                  <CardTitle>Best Performing Teams</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
                    </div>
                  ) : teamLeaderboard.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Rank</th>
                            <th className="text-left py-3 px-4">Game Code</th>
                            <th className="text-right py-3 px-4">Total Cost</th>
                            <th className="text-right py-3 px-4">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamLeaderboard.map((entry, index) => (
                            <tr key={entry.game_code} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                {index === 0 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-400 text-white rounded-full">
                                    1
                                  </span>
                                ) : index === 1 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-300 text-white rounded-full">
                                    2
                                  </span>
                                ) : index === 2 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-600 text-white rounded-full">
                                    3
                                  </span>
                                ) : (
                                  index + 1
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono">{entry.game_code}</td>
                              <td className="py-3 px-4 text-right font-semibold">${entry.team_cost.toFixed(2)}</td>
                              <td className="py-3 px-4 text-right">{formatDate(entry.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No completed games yet. Be the first to complete a game and make it to the leaderboard!
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="players">
              <Card>
                <CardHeader>
                  <CardTitle>Best Individual Players</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
                    </div>
                  ) : playerLeaderboard.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Rank</th>
                            <th className="text-left py-3 px-4">Player</th>
                            <th className="text-left py-3 px-4">Role</th>
                            <th className="text-left py-3 px-4">Game</th>
                            <th className="text-right py-3 px-4">Individual Cost</th>
                            <th className="text-right py-3 px-4">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {playerLeaderboard.map((entry, index) => (
                            <tr key={`${entry.game_code}-${entry.role}`} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                {index === 0 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-400 text-white rounded-full">
                                    1
                                  </span>
                                ) : index === 1 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-300 text-white rounded-full">
                                    2
                                  </span>
                                ) : index === 2 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-600 text-white rounded-full">
                                    3
                                  </span>
                                ) : (
                                  index + 1
                                )}
                              </td>
                              <td className="py-3 px-4">{entry.player_name}</td>
                              <td className="py-3 px-4 capitalize">{entry.role}</td>
                              <td className="py-3 px-4 font-mono">{entry.game_code}</td>
                              <td className="py-3 px-4 text-right font-semibold">${entry.player_cost.toFixed(2)}</td>
                              <td className="py-3 px-4 text-right">{formatDate(entry.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No player data available yet. Complete a game to appear on the leaderboard!
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-center">
            <Link href="/">
              <Button variant="outline" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
