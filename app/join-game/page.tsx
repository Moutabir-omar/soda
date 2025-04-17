"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"
import type { PlayerRole } from "@/lib/types"
import { addPlayer, checkRoleAvailable, getGameByCode, getGamePlayers } from "@/lib/game-service"

export default function JoinGamePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get("code")

  const [gameId, setGameId] = useState("")
  const [gameCode, setGameCode] = useState(codeFromUrl || "")
  const [playerName, setPlayerName] = useState("")
  const [selectedRole, setSelectedRole] = useState<PlayerRole | null>(null)
  const [error, setError] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<Record<PlayerRole, boolean>>({
    retailer: true,
    wholesaler: true,
    distributor: true,
    manufacturer: true,
  })
  const [isLoading, setIsLoading] = useState(!!codeFromUrl)

  useEffect(() => {
    if (codeFromUrl) {
      checkGameCode(codeFromUrl)
    }
  }, [codeFromUrl])

  const checkGameCode = async (code: string) => {
    setIsLoading(true)
    setError("")

    try {
      console.log("Checking game code:", code)

      if (!code) {
        setError("Please enter a game code")
        setIsLoading(false)
        return
      }

      const game = await getGameByCode(code)
      console.log("Game found:", game)

      if (!game) {
        setError("Invalid game code. Please check and try again.")
        setIsLoading(false)
        return
      }

      setGameId(game.id!)

      // Check which roles are available
      console.log("Checking available roles for game:", game.id)
      const players = await getGamePlayers(game.id!)
      console.log("Players found:", players)

      const newAvailableRoles: Record<PlayerRole, boolean> = {
        retailer: !players.retailer,
        wholesaler: !players.wholesaler,
        distributor: !players.distributor,
        manufacturer: !players.manufacturer,
      }

      setAvailableRoles(newAvailableRoles)

      // Auto-select the first available role
      const firstAvailableRole = Object.entries(newAvailableRoles).find(([_, available]) => available)?.[0] as
        | PlayerRole
        | undefined

      if (firstAvailableRole) {
        setSelectedRole(firstAvailableRole)
      } else {
        setError("All roles are taken in this game. Please join another game or create a new one.")
      }

      setIsLoading(false)
    } catch (error) {
      console.error("Error checking game code:", error)
      setError("Error checking game code. Please try again.")
      setIsLoading(false)
    }
  }

  const handleCheckGameCode = () => {
    if (!gameCode) {
      setError("Please enter a game code")
      return
    }

    checkGameCode(gameCode)
  }

  const handleJoinGame = async () => {
    if (!gameId) {
      setError("Please enter a valid game code")
      return
    }

    if (!playerName) {
      setError("Please enter your name")
      return
    }

    if (!selectedRole) {
      setError("Please select a role")
      return
    }

    setIsJoining(true)
    setError("")

    try {
      // Check if the role is still available
      const isAvailable = await checkRoleAvailable(gameId, selectedRole)

      if (!isAvailable) {
        setError(`The ${selectedRole} role is no longer available`)
        setIsJoining(false)

        // Refresh available roles
        const players = await getGamePlayers(gameId)
        const newAvailableRoles: Record<PlayerRole, boolean> = {
          retailer: !players.retailer,
          wholesaler: !players.wholesaler,
          distributor: !players.distributor,
          manufacturer: !players.manufacturer,
        }

        setAvailableRoles(newAvailableRoles)
        return
      }

      // Join the game
      await addPlayer(gameId, selectedRole, playerName)

      // Navigate to the game page
      router.push(`/game/${gameId}?role=${selectedRole}&name=${encodeURIComponent(playerName)}`)
    } catch (error) {
      console.error("Error joining game:", error)
      setError("Error joining game")
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-purple-900">Join Game</CardTitle>
            <CardDescription>Enter a game code and select your role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800">{error}</div>}

            <div className="space-y-2">
              <Label htmlFor="gameCode">Game Code</Label>
              <div className="flex gap-2">
                <Input
                  id="gameCode"
                  placeholder="Enter 6-digit code"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  disabled={isLoading || !!gameId}
                />
                {!gameId && (
                  <Button onClick={handleCheckGameCode} disabled={isLoading || !gameCode}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                  </Button>
                )}
              </div>
            </div>

            {gameId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="playerName">Your Name</Label>
                  <Input
                    id="playerName"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={isJoining}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Select Role</Label>
                  <RadioGroup
                    value={selectedRole || ""}
                    onValueChange={(value) => setSelectedRole(value as PlayerRole)}
                  >
                    <div
                      className={`flex items-center space-x-2 p-2 rounded-md ${availableRoles.retailer ? "hover:bg-gray-100" : "opacity-50"}`}
                    >
                      <RadioGroupItem value="retailer" id="retailer" disabled={!availableRoles.retailer || isJoining} />
                      <Label htmlFor="retailer" className="flex-1 cursor-pointer">
                        Retailer {!availableRoles.retailer && "(Taken)"}
                      </Label>
                    </div>
                    <div
                      className={`flex items-center space-x-2 p-2 rounded-md ${availableRoles.wholesaler ? "hover:bg-gray-100" : "opacity-50"}`}
                    >
                      <RadioGroupItem
                        value="wholesaler"
                        id="wholesaler"
                        disabled={!availableRoles.wholesaler || isJoining}
                      />
                      <Label htmlFor="wholesaler" className="flex-1 cursor-pointer">
                        Wholesaler {!availableRoles.wholesaler && "(Taken)"}
                      </Label>
                    </div>
                    <div
                      className={`flex items-center space-x-2 p-2 rounded-md ${availableRoles.distributor ? "hover:bg-gray-100" : "opacity-50"}`}
                    >
                      <RadioGroupItem
                        value="distributor"
                        id="distributor"
                        disabled={!availableRoles.distributor || isJoining}
                      />
                      <Label htmlFor="distributor" className="flex-1 cursor-pointer">
                        Distributor {!availableRoles.distributor && "(Taken)"}
                      </Label>
                    </div>
                    <div
                      className={`flex items-center space-x-2 p-2 rounded-md ${availableRoles.manufacturer ? "hover:bg-gray-100" : "opacity-50"}`}
                    >
                      <RadioGroupItem
                        value="manufacturer"
                        id="manufacturer"
                        disabled={!availableRoles.manufacturer || isJoining}
                      />
                      <Label htmlFor="manufacturer" className="flex-1 cursor-pointer">
                        Manufacturer {!availableRoles.manufacturer && "(Taken)"}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.push("/")} disabled={isJoining}>
              Cancel
            </Button>
            {gameId ? (
              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={handleJoinGame}
                disabled={isJoining || !selectedRole || !playerName}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Game"
                )}
              </Button>
            ) : (
              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={handleCheckGameCode}
                disabled={isLoading || !gameCode}
              >
                Check Game Code
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
