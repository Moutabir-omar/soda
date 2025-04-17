"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { GameDashboard } from "@/components/game-dashboard"
import { SupplyChainDiagram } from "@/components/supply-chain-diagram"
import type { GameState, PlayerRole, PlayerState } from "@/lib/types"
import { useGameSocket } from "@/hooks/use-game-socket"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GameStats } from "@/components/game-stats"
import { WaitingRoom } from "@/components/waiting-room"
import { supabase } from "@/lib/supabase"
import { getGameByCode, getGameById, getGamePlayers } from "@/lib/game-service"
import { Loader2 } from "lucide-react"
import { ErrorFallback } from "@/components/error-fallback"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CostBreakdown } from "@/components/cost-breakdown"
import { BullwhipVisualization } from "@/components/bullwhip-visualization"
import { SupplyChainVisibility } from "@/components/supply-chain-visibility"

export default function GamePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const gameId = params.id as string
  const role = searchParams.get("role") as PlayerRole | null
  const playerName = searchParams.get("name")

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [players, setPlayers] = useState<Record<PlayerRole, string | null>>({
    retailer: null,
    wholesaler: null,
    distributor: null,
    manufacturer: null,
  })

  // Add state for error handling
  const [error, setError] = useState<Error | null>(null)

  // Connect to the game via Supabase realtime
  const { connected, sendOrder, startGame } = useGameSocket(gameId, role, playerName || "Player")

  // Function to load game state
  const loadGameState = async () => {
    setError(null)
    setIsLoading(true)

    try {
      console.log("Attempting to load game state for ID:", gameId)

      if (!gameId) {
        throw new Error("Game ID is missing")
      }

      // First try to get the game by ID (UUID)
      let game = await getGameById(gameId)

      // If not found by ID, try by game code
      if (!game) {
        console.log("Game not found by ID, trying by code...")
        game = await getGameByCode(gameId)
      }

      console.log("Game state loaded:", game)

      if (!game) {
        throw new Error(`Game with ID or code ${gameId} not found`)
      }

      setGameState(game)

      // Load players
      const gamePlayers = await getGamePlayers(game.id!)
      console.log("Game players loaded:", gamePlayers)
      setPlayers(gamePlayers)

      setIsLoading(false)
    } catch (err) {
      console.error("Error loading game state:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadGameState()

    // Set up realtime subscription for game updates
    const gameSubscription = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        async (payload) => {
          console.log("Game updated via realtime:", payload)
          // Reload game state when the game is updated
          loadGameState()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          console.log("Player updated via realtime:", payload)
          // Reload game state when players are updated
          loadGameState()
        },
      )
      .subscribe((status) => {
        console.log("Supabase realtime subscription status:", status)
      })

    return () => {
      console.log("Cleaning up realtime subscription")
      gameSubscription.unsubscribe()
    }
  }, [gameId])

  const handleStartGame = async () => {
    try {
      console.log("Starting game from UI...")
      await startGame()
      console.log("Game start request sent successfully")

      // Force reload game state after a short delay
      setTimeout(() => {
        console.log("Forcing game state reload after start")
        loadGameState()
      }, 2000)
    } catch (error) {
      console.error("Error starting game from UI:", error)
      setError(error instanceof Error ? error : new Error(String(error)))
    }
  }

  // Add this function to immediately show projected inventory after ordering
  const simulateInventoryUpdate = async (gameId: string, role: PlayerRole, orderQuantity: number) => {
    try {
      // Get the player data
      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", gameId)
        .eq("role", role)
        .single()
        
      if (playerError || !player) {
        console.error("Error fetching player for simulation:", playerError)
        return
      }
      
      // Get the game data for cost calculations
      const { data: game, error: gameError } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single()
        
      if (gameError || !game) {
        console.error("Error fetching game for simulation:", gameError)
        return
      }
      
      console.log("Simulating inventory update for order:", orderQuantity)
      
      // Calculate how much can be shipped from current inventory to fulfill demand
      const availableToShip = Math.min(player.incoming_order, player.inventory)
      const backloggedAmount = Math.max(0, player.incoming_order - availableToShip)
      
      // Calculate new inventory level after shipping
      const newInventory = Math.max(0, player.inventory - availableToShip)
      
      // Calculate costs based on the new inventory and backlog
      const holdingCost = newInventory * game.holding_cost
      const backorderCost = (player.backlog + backloggedAmount) * game.backorder_cost
      const totalCost = player.total_cost + holdingCost + backorderCost
      
      // Update the player in database to show changes immediately in UI
      await supabase
        .from("players")
        .update({
          outgoing_order: orderQuantity,
          inventory: newInventory,
          backlog: player.backlog + backloggedAmount,
          weekly_holding_cost: holdingCost,
          weekly_backorder_cost: backorderCost,
          total_cost: totalCost
        })
        .eq("game_id", gameId)
        .eq("role", role)
        
      console.log("Simulated inventory update successful:", {
        inventory: newInventory,
        backlog: player.backlog + backloggedAmount,
        costs: { holding: holdingCost, backorder: backorderCost, total: totalCost }
      })
    } catch (error) {
      console.error("Error in simulateInventoryUpdate:", error)
    }
  }

  const handlePlaceOrder = async (quantity: number) => {
    if (!role || !gameState) return
    
    try {
      setIsLoading(true)
      console.log(`Placing order of ${quantity} as ${role}`)
      
      // Force get fresh player state to check if order already placed in backend
      const { data: freshPlayerState, error: playerError } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", gameId)
        .eq("role", role)
        .single()
        
      if (playerError) {
        console.error("Error fetching fresh player state:", playerError)
        // Continue anyway and try to place the order
      } else if (freshPlayerState && freshPlayerState.outgoing_order !== null) {
        console.log("Order already placed in backend, refreshing game state only")
        // Just refresh the game state and return
        await loadGameState()
        setIsLoading(false)
        return
      }
      
      // Update the UI immediately to show the order is being processed
      const playerStateCopy = {...gameState[role]};
      playerStateCopy.outgoing_order = quantity;
      
      // Place the order
      await sendOrder(quantity)
      console.log("Order placed successfully")
      
      // Simulate inventory update to immediately show changes
      await simulateInventoryUpdate(gameId, role, quantity)
      
      // Wait a moment for the backend to process
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Force immediate reload of game state to reflect order placement
      await loadGameState()
      
      // Check if all players have placed orders
      console.log("Checking if all players have placed orders")
      const updatedGame = await getGameById(gameId)
      const allPlayers = await getGamePlayers(gameId)
      
      if (!updatedGame || !allPlayers) {
        throw new Error("Could not fetch updated game state")
      }
      
      // Log each player's order status for debugging
      Object.entries(allPlayers).forEach(([playerRole, playerName]) => {
        if (playerName) {
          const playerState = updatedGame[playerRole as PlayerRole]
          if (playerState) {
            console.log(`${playerRole} order status:`, playerState.outgoing_order)
          }
        }
      })
      
      const allOrdersPlaced = Object.values(updatedGame)
        .filter((value): value is PlayerState => 
          typeof value === 'object' && value !== null && 'role' in value
        )
        .every(player => player.outgoing_order !== null)
      
      console.log("All orders placed:", allOrdersPlaced)
      
      if (allOrdersPlaced) {
        console.log("All orders placed, processing week")
        try {
          // If all players have placed orders, manually process the week
          const success = await processWeek(gameId)
          
          if (!success) {
            console.error("Week processing failed")
            // Don't throw an error here, just continue
            console.log("Continuing without week processing")
          }
          
          // Force another game state reload after processing the week
          await new Promise(resolve => setTimeout(resolve, 1000)) // Allow time for database updates
          await loadGameState()
        } catch (processError) {
          console.error("Error processing week, but continuing:", processError)
          // Don't set error, just log it
        }
      }
    } catch (error) {
      console.error("Error placing order:", error)
      setError(error instanceof Error ? error : new Error(String(error)))
    } finally {
      setIsLoading(false)
    }
  }

  // Add a function to check if we're waiting for other players
  const isWaitingForOthers = () => {
    if (!gameState || !role) return false
    
    const playerState = gameState[role]
    if (!playerState) return false
    
    // We've placed our order but the game hasn't advanced to the next week
    return playerState.outgoing_order !== null && !isLoading && gameState.status === "active"
  }

  // Add a useEffect to handle game state updates
  useEffect(() => {
    if (gameState) {
      // Update charts and statistics when game state changes
      console.log("Game state updated, current week:", gameState.current_week)
    }
  }, [gameState])

  const processWeek = async (gameId: string) => {
    try {
      setIsLoading(true)
      
      // Get current game state
      const game = await getGameById(gameId)
      if (!game) throw new Error("Game not found")

      console.log("Processing week for game:", gameId)
      
      // Process all orders and shipments
      await processOrders(gameId)
      await processShipments(gameId)

      // Advance to next week
      const nextWeek = game.current_week + 1
      if (nextWeek > game.total_weeks) {
        // End the game
        await endGame(gameId)
      } else {
        // Update game state for next week
        await updateGameWeek(gameId, nextWeek)
      }
      
      // Force reload game state after processing
      await new Promise(resolve => setTimeout(resolve, 1000))
      await loadGameState()
      
      console.log("Week processing completed successfully")
      return true
    } catch (error) {
      console.error("Error processing week:", error)
      setError(error instanceof Error ? error : new Error(String(error)))
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const processOrders = async (gameId: string) => {
    // Get all players
    const players = await getGamePlayers(gameId)
    
    // Process each player's orders
    for (const [role, playerData] of Object.entries(players)) {
      const player = playerData as unknown as PlayerState
      if (player && player.outgoing_order !== null) {
        // Update the recipient's incoming order
        const recipientRole = getRecipientRole(role as PlayerRole)
        if (recipientRole !== "factory") {
          await updatePlayerOrder(gameId, recipientRole as PlayerRole, player.outgoing_order)
        }
      }
    }
  }

  const processShipments = async (gameId: string) => {
    // Get all players
    const players = await getGamePlayers(gameId)
    
    // Process each player's shipments
    for (const [role, playerData] of Object.entries(players)) {
      const player = playerData as unknown as PlayerState
      if (player) {
        // Calculate how much can be shipped from available inventory
        const availableToShip = Math.min(player.incoming_order, player.inventory)
        const backloggedAmount = Math.max(0, player.incoming_order - availableToShip)
        
        // Calculate new inventory level after shipping
        const newInventory = Math.max(0, player.inventory - availableToShip)
        
        // Update player's inventory and backlog
        await supabase
          .from("players")
          .update({
            inventory: newInventory,
          backlog: player.backlog + backloggedAmount,
            outgoing_shipment: availableToShip,
            total_inventory: player.total_inventory + newInventory,
            total_backorders: player.total_backorders + backloggedAmount,
            outgoing_order: null // Reset outgoing order for next week
        })
          .eq("game_id", gameId)
          .eq("role", role as PlayerRole)
        
        console.log(`Updated ${role} - Shipped: ${availableToShip}, New inventory: ${newInventory}, Backlog: ${player.backlog + backloggedAmount}`)
        
        // Update recipient's incoming shipment
        const recipientRole = getRecipientRole(role as PlayerRole)
        if (recipientRole !== "customer") {
          await updatePlayerShipment(gameId, recipientRole as PlayerRole, availableToShip)
        }
        
        // Update costs separately to ensure they're calculated correctly
        await updatePlayerCosts(gameId, role as PlayerRole)
      }
    }
  }

  // Add a function to update player costs
  const updatePlayerCosts = async (gameId: string, role: PlayerRole) => {
    // Get the player's updated state
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", gameId)
      .eq("role", role)
      .single()
    
    if (playerError || !player) {
      console.error("Error fetching player for cost update:", playerError)
      return
    }
    
    // Get the game configuration
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single()
    
    if (gameError || !game) {
      console.error("Error fetching game for cost update:", gameError)
      return
    }
    
    // Calculate costs
    const holdingCost = player.inventory * game.holding_cost
    const backorderCost = player.backlog * game.backorder_cost
    const totalWeeklyCost = holdingCost + backorderCost
    
    // Update the player's costs
    await supabase
      .from("players")
      .update({
        weekly_holding_cost: holdingCost,
        weekly_backorder_cost: backorderCost,
        total_holding_cost: player.total_holding_cost + holdingCost,
        total_backorder_cost: player.total_backorder_cost + backorderCost,
        total_cost: player.total_cost + totalWeeklyCost
      })
      .eq("game_id", gameId)
      .eq("role", role)
    
    console.log(`Updated costs for ${role}: Holding=${holdingCost}, Backorder=${backorderCost}, Total=${totalWeeklyCost}`)
  }

  const updateGameWeek = async (gameId: string, nextWeek: number) => {
    console.log(`Advancing game ${gameId} to week ${nextWeek}`)
    
    try {
      // First, update the game week
    await supabase
      .from("games")
      .update({ current_week: nextWeek })
      .eq("id", gameId)
    
      // Then prepare for the next week by updating player states
      const players = await getGamePlayers(gameId)
      
      // For each player, update their incoming shipments for the next week
      for (const [role, playerData] of Object.entries(players)) {
        if (!playerData) continue
        
        const player = playerData as unknown as PlayerState
        
        // Get the shipments that will arrive next week
        const { data: incomingShipments, error: shipmentError } = await supabase
          .from("orders")
          .select("quantity")
          .eq("game_id", gameId)
          .eq("to_role", role)
          .eq("week_delivered", nextWeek + 1) // Shipments arriving next week
          .eq("is_delivered", false)
        
        if (shipmentError) {
          console.error(`Error fetching incoming shipments for ${role}:`, shipmentError)
          continue
        }
        
        // Calculate the next week's shipment quantity
        const nextWeekShipment = incomingShipments.reduce((sum, order) => sum + order.quantity, 0)
        
        // Update the player's next week incoming shipment and reset outgoing_order for next round
        await supabase
          .from("players")
          .update({ 
            next_week_incoming_shipment: nextWeekShipment,
            // Reset the outgoing order so player can place an order for next week
            outgoing_order: null
          })
          .eq("game_id", gameId)
          .eq("role", role)
        
        console.log(`Updated ${role} for week ${nextWeek}: next week shipment = ${nextWeekShipment}`)
      }
      
      console.log(`Successfully advanced game to week ${nextWeek}`)
    } catch (error) {
      console.error(`Error advancing to week ${nextWeek}:`, error)
      throw error
    }
  }

  const endGame = async (gameId: string) => {
    // Update game status to completed
    await supabase
      .from("games")
      .update({ status: "completed" })
      .eq("id", gameId)
  }

  const getRecipientRole = (role: PlayerRole): PlayerRole | "customer" | "factory" => {
    switch (role) {
      case "retailer":
        return "wholesaler"
      case "wholesaler":
        return "distributor"
      case "distributor":
        return "manufacturer"
      case "manufacturer":
        return "factory"
      default:
        throw new Error(`Invalid role: ${role}`)
    }
  }

  const updatePlayerOrder = async (gameId: string, role: PlayerRole, quantity: number) => {
    await supabase
      .from("players")
      .update({ incoming_order: quantity })
      .eq("game_id", gameId)
      .eq("role", role)
  }

  const updatePlayerInventory = async (
    gameId: string,
    role: PlayerRole,
    updates: { inventory: number; backlog: number; outgoing_shipment: number }
  ) => {
    await supabase
      .from("players")
      .update(updates)
      .eq("game_id", gameId)
      .eq("role", role)
  }

  const updatePlayerShipment = async (gameId: string, role: PlayerRole, quantity: number) => {
    await supabase
      .from("players")
      .update({ incoming_shipment: quantity })
      .eq("game_id", gameId)
      .eq("role", role)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-purple-50">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-sara-gold">Processing Game State...</h2>
          <div className="flex justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-sara-purple" />
          </div>
          <p className="text-gray-600">
            {isWaitingForOthers() 
              ? "Waiting for other players to place their orders..." 
              : gameState && gameState.current_week 
                ? `Processing week ${gameState.current_week} data...`
                : "Initializing game state..."}
          </p>
          {error && (
            <div className="mt-4 p-2 bg-red-50 text-red-600 rounded-md text-sm">
              {error.message || "An error occurred while processing the game state."}
            </div>
          )}
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <ErrorFallback
        error={error}
        resetErrorBoundary={() => {
          setError(null)
          loadGameState()
        }}
      />
    )
  }

  if (isLoading || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-purple-50">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-sara-gold">Loading Game...</h2>
          <div className="flex justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-sara-purple" />
          </div>
          <p className="text-gray-600 mb-4">
            If loading takes too long, the game might not exist or there might be a connection issue.
          </p>
          <Link href="/">
            <Button className="bg-sara-purple hover:bg-opacity-90">Return to Home</Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-purple-50">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-sara-gold">Connecting to Game...</h2>
          <p className="mb-4">Attempting to connect to game session {gameId}</p>
          <div className="animate-pulse flex justify-center">
            <div className="h-4 w-4 bg-sara-purple rounded-full mx-1"></div>
            <div className="h-4 w-4 bg-sara-purple rounded-full mx-1 animate-delay-200"></div>
            <div className="h-4 w-4 bg-sara-purple rounded-full mx-1 animate-delay-400"></div>
          </div>
        </Card>
      </div>
    )
  }

  if (gameState.status === "waiting") {
    return <WaitingRoom gameId={gameState.id!} players={players} currentRole={role} onStartGame={handleStartGame} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 py-4">
      <div className="container mx-auto px-4">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-sara-gold">Soda Distribution Game</h1>
          <div className="flex justify-between items-center text-gray-700">
            <p>Game ID: {gameState.game_code}</p>
            <p>
              Week: {gameState.current_week} of {gameState.total_weeks}
            </p>
            <p>Role: {role ? role.charAt(0).toUpperCase() + role.slice(1) : "Observer"}</p>
          </div>
        </header>

        <Tabs defaultValue="dashboard">
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="supply-chain">Supply Chain</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {role && (
              <>
                <GameDashboard 
                  gameState={gameState} 
                  role={role} 
                  onPlaceOrder={handlePlaceOrder} 
                />
                {isWaitingForOthers() && (
                  <div className="mt-4 flex justify-end">
                    <Button 
                      onClick={() => processWeek(gameState.id!)}
                      className="bg-sara-purple hover:bg-opacity-90 text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>Move to Next Round →</>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="supply-chain">
            <SupplyChainDiagram gameState={gameState} currentRole={role} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Supply Chain Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add Bullwhip Visualization */}
                <BullwhipVisualization gameState={gameState} />
                
                {/* Add Supply Chain Visibility */}
                {role && <SupplyChainVisibility gameState={gameState} playerRole={role} />}
                
                {/* Add Cost Breakdown */}
                {role && <CostBreakdown gameState={gameState} playerState={gameState[role]} />}
                
                {/* Keep existing GameStats component */}
                <GameStats gameState={gameState} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
