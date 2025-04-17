"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { GameConfig } from "@/lib/types"
import { createGame } from "@/lib/game-service"
import { Loader2 } from "lucide-react"

export default function NewGamePage() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [gameConfig, setGameConfig] = useState<GameConfig>({
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
    aiPlayers: [],
  })

  const handleCreateGame = async () => {
    setIsCreating(true)
    try {
      // Create the game in the database
      const gameCode = await createGame(gameConfig)

      // Navigate to the join game page with the game code
      router.push(`/join-game?code=${gameCode}`)
    } catch (error) {
      console.error("Error creating game:", error)
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto border-sara-coral">
          <CardHeader>
            <CardTitle className="text-2xl text-sara-gold">Create New Game</CardTitle>
            <CardDescription>Configure your Soda Distribution Game settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Initial Conditions</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initialInventory">Initial Inventory (all roles)</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      id="initialInventory"
                      min={0}
                      max={30}
                      step={1}
                      value={[gameConfig.initialInventory]}
                      onValueChange={(value) => setGameConfig({ ...gameConfig, initialInventory: value[0] })}
                      className="flex-1"
                    />
                    <span className="w-12 text-center">{gameConfig.initialInventory}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initialBacklog">Initial Backlog (all roles)</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      id="initialBacklog"
                      min={0}
                      max={10}
                      step={1}
                      value={[gameConfig.initialBacklog]}
                      onValueChange={(value) => setGameConfig({ ...gameConfig, initialBacklog: value[0] })}
                      className="flex-1"
                    />
                    <span className="w-12 text-center">{gameConfig.initialBacklog}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Lead Times (weeks)</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retailerLeadTime">Retailer Lead Time</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      id="retailerLeadTime"
                      min={1}
                      max={6}
                      step={1}
                      value={[gameConfig.leadTime.retailer]}
                      onValueChange={(value) =>
                        setGameConfig({
                          ...gameConfig,
                          leadTime: { ...gameConfig.leadTime, retailer: value[0] },
                        })
                      }
                      className="flex-1"
                    />
                    <span className="w-12 text-center">{gameConfig.leadTime.retailer}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wholesalerLeadTime">Wholesaler Lead Time</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      id="wholesalerLeadTime"
                      min={1}
                      max={6}
                      step={1}
                      value={[gameConfig.leadTime.wholesaler]}
                      onValueChange={(value) =>
                        setGameConfig({
                          ...gameConfig,
                          leadTime: { ...gameConfig.leadTime, wholesaler: value[0] },
                        })
                      }
                      className="flex-1"
                    />
                    <span className="w-12 text-center">{gameConfig.leadTime.wholesaler}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="distributorLeadTime">Distributor Lead Time</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      id="distributorLeadTime"
                      min={1}
                      max={6}
                      step={1}
                      value={[gameConfig.leadTime.distributor]}
                      onValueChange={(value) =>
                        setGameConfig({
                          ...gameConfig,
                          leadTime: { ...gameConfig.leadTime, distributor: value[0] },
                        })
                      }
                      className="flex-1"
                    />
                    <span className="w-12 text-center">{gameConfig.leadTime.distributor}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manufacturerLeadTime">Manufacturer Lead Time</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      id="manufacturerLeadTime"
                      min={1}
                      max={6}
                      step={1}
                      value={[gameConfig.leadTime.manufacturer]}
                      onValueChange={(value) =>
                        setGameConfig({
                          ...gameConfig,
                          leadTime: { ...gameConfig.leadTime, manufacturer: value[0] },
                        })
                      }
                      className="flex-1"
                    />
                    <span className="w-12 text-center">{gameConfig.leadTime.manufacturer}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Demand Pattern</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="demandPattern">Pattern Type</Label>
                  <Select
                    value={gameConfig.demandPattern}
                    onValueChange={(value) =>
                      setGameConfig({
                        ...gameConfig,
                        demandPattern: value as "fixed" | "random" | "step",
                      })
                    }
                  >
                    <SelectTrigger id="demandPattern">
                      <SelectValue placeholder="Select demand pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Demand</SelectItem>
                      <SelectItem value="random">Random (Normal Distribution)</SelectItem>
                      <SelectItem value="step">Step Change</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {gameConfig.demandPattern === "fixed" && (
                  <div className="space-y-2">
                    <Label htmlFor="fixedDemand">Fixed Demand Value</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="fixedDemand"
                        min={1}
                        max={20}
                        step={1}
                        value={[gameConfig.fixedDemand]}
                        onValueChange={(value) => setGameConfig({ ...gameConfig, fixedDemand: value[0] })}
                        className="flex-1"
                      />
                      <span className="w-12 text-center">{gameConfig.fixedDemand}</span>
                    </div>
                  </div>
                )}

                {gameConfig.demandPattern === "random" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="randomDemandMean">Mean Demand</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          id="randomDemandMean"
                          min={1}
                          max={20}
                          step={1}
                          value={[gameConfig.randomDemandMean]}
                          onValueChange={(value) => setGameConfig({ ...gameConfig, randomDemandMean: value[0] })}
                          className="flex-1"
                        />
                        <span className="w-12 text-center">{gameConfig.randomDemandMean}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="randomDemandVariance">Variance</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          id="randomDemandVariance"
                          min={0.1}
                          max={5}
                          step={0.1}
                          value={[gameConfig.randomDemandVariance]}
                          onValueChange={(value) => setGameConfig({ ...gameConfig, randomDemandVariance: value[0] })}
                          className="flex-1"
                        />
                        <span className="w-12 text-center">{gameConfig.randomDemandVariance.toFixed(1)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Costs</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="holdingCost">Holding Cost (per case per week)</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      id="holdingCost"
                      min={0.1}
                      max={2}
                      step={0.1}
                      value={[gameConfig.holdingCost]}
                      onValueChange={(value) => setGameConfig({ ...gameConfig, holdingCost: value[0] })}
                      className="flex-1"
                    />
                    <span className="w-12 text-center">{gameConfig.holdingCost.toFixed(1)} MAD</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backorderCost">Backorder Cost (per case per week)</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      id="backorderCost"
                      min={0.5}
                      max={5}
                      step={0.1}
                      value={[gameConfig.backorderCost]}
                      onValueChange={(value) => setGameConfig({ ...gameConfig, backorderCost: value[0] })}
                      className="flex-1"
                    />
                    <span className="w-12 text-center">{gameConfig.backorderCost.toFixed(1)} MAD</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Game Duration</h3>

              <div className="space-y-2">
                <Label htmlFor="weeks">Number of Weeks</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    id="weeks"
                    min={10}
                    max={52}
                    step={1}
                    value={[gameConfig.weeks]}
                    onValueChange={(value) => setGameConfig({ ...gameConfig, weeks: value[0] })}
                    className="flex-1"
                  />
                  <span className="w-12 text-center">{gameConfig.weeks}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">AI Players</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="aiRetailer"
                    checked={gameConfig.aiPlayers.includes("retailer")}
                    onCheckedChange={(checked) => {
                      const newAiPlayers = checked
                        ? [...gameConfig.aiPlayers, "retailer"]
                        : gameConfig.aiPlayers.filter((role) => role !== "retailer")
                      setGameConfig({ ...gameConfig, aiPlayers: newAiPlayers })
                    }}
                  />
                  <Label htmlFor="aiRetailer">AI Retailer</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="aiWholesaler"
                    checked={gameConfig.aiPlayers.includes("wholesaler")}
                    onCheckedChange={(checked) => {
                      const newAiPlayers = checked
                        ? [...gameConfig.aiPlayers, "wholesaler"]
                        : gameConfig.aiPlayers.filter((role) => role !== "wholesaler")
                      setGameConfig({ ...gameConfig, aiPlayers: newAiPlayers })
                    }}
                  />
                  <Label htmlFor="aiWholesaler">AI Wholesaler</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="aiDistributor"
                    checked={gameConfig.aiPlayers.includes("distributor")}
                    onCheckedChange={(checked) => {
                      const newAiPlayers = checked
                        ? [...gameConfig.aiPlayers, "distributor"]
                        : gameConfig.aiPlayers.filter((role) => role !== "distributor")
                      setGameConfig({ ...gameConfig, aiPlayers: newAiPlayers })
                    }}
                  />
                  <Label htmlFor="aiDistributor">AI Distributor</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="aiManufacturer"
                    checked={gameConfig.aiPlayers.includes("manufacturer")}
                    onCheckedChange={(checked) => {
                      const newAiPlayers = checked
                        ? [...gameConfig.aiPlayers, "manufacturer"]
                        : gameConfig.aiPlayers.filter((role) => role !== "manufacturer")
                      setGameConfig({ ...gameConfig, aiPlayers: newAiPlayers })
                    }}
                  />
                  <Label htmlFor="aiManufacturer">AI Manufacturer</Label>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.push("/")} disabled={isCreating}>
              Cancel
            </Button>
            <Button className="bg-sara-purple hover:bg-opacity-90" onClick={handleCreateGame} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Game"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
