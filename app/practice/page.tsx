"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"
import type { PlayerRole } from "@/lib/types"
import { createGame } from "@/lib/game-service"

export default function PracticePage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<PlayerRole | null>(null)
  const [playerName, setPlayerName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleStartPractice = async () => {
    if (!selectedRole) return

    setIsCreating(true)
    try {
      // Create a game with AI players for all roles except the selected one
      const aiPlayers: PlayerRole[] = ["retailer", "wholesaler", "distributor", "manufacturer"].filter(
        (role) => role !== selectedRole,
      )

      // Create the game in the database
      const gameCode = await createGame({
        initialInventory: 12,
        initialBacklog: 0,
        leadTime: {
          retailer: 2,
          wholesaler: 2,
          distributor: 2,
          manufacturer: 3,
        },
        demandPattern: "fixed",
        fixedDemand: 4,
        randomDemandMean: 4,
        randomDemandVariance: 1,
        holdingCost: 0.5,
        backorderCost: 1.0,
        weeks: 26,
        aiPlayers,
      })

      // Navigate to the game page
      router.push(`/game/${gameCode}?role=${selectedRole}&name=${encodeURIComponent(playerName || "Player")}`)
    } catch (error) {
      console.error("Error creating practice game:", error)
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-purple-900">Practice Mode</CardTitle>
            <CardDescription>Play against AI opponents to practice your supply chain management skills</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="playerName">Your Name</Label>
              <input
                id="playerName"
                className="w-full p-2 border rounded-md"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Your Role</Label>
              <RadioGroup value={selectedRole || ""} onValueChange={(value) => setSelectedRole(value as PlayerRole)}>
                <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100">
                  <RadioGroupItem value="retailer" id="retailer" disabled={isCreating} />
                  <Label htmlFor="retailer" className="flex-1 cursor-pointer">
                    Retailer
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100">
                  <RadioGroupItem value="wholesaler" id="wholesaler" disabled={isCreating} />
                  <Label htmlFor="wholesaler" className="flex-1 cursor-pointer">
                    Wholesaler
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100">
                  <RadioGroupItem value="distributor" id="distributor" disabled={isCreating} />
                  <Label htmlFor="distributor" className="flex-1 cursor-pointer">
                    Distributor
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100">
                  <RadioGroupItem value="manufacturer" id="manufacturer" disabled={isCreating} />
                  <Label htmlFor="manufacturer" className="flex-1 cursor-pointer">
                    Manufacturer
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.push("/")} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              className="bg-purple-700 hover:bg-purple-800"
              onClick={handleStartPractice}
              disabled={isCreating || !selectedRole}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Game...
                </>
              ) : (
                "Start Practice"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
