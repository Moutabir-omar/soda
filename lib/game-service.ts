import { supabase } from "./supabase"
import type { GameConfig, GameState, PlayerRole, PlayerState } from "./types"
import { calculateNormalRandom, calculateStepDemand, generateGameId } from "./utils"

export async function createGame(config: GameConfig): Promise<string> {
  // Generate a unique game code
  const gameCode = generateGameId()

  // Create the game in the database
  const { data: game, error } = await supabase
    .from("games")
    .insert({
      game_code: gameCode,
      status: "waiting",
      current_week: 1,
      total_weeks: config.weeks,
      initial_inventory: config.initialInventory,
      initial_backlog: config.initialBacklog,
      retailer_lead_time: config.leadTime.retailer,
      wholesaler_lead_time: config.leadTime.wholesaler,
      distributor_lead_time: config.leadTime.distributor,
      manufacturer_lead_time: config.leadTime.manufacturer,
      demand_pattern: config.demandPattern,
      fixed_demand: config.fixedDemand,
      random_demand_mean: config.randomDemandMean,
      random_demand_variance: config.randomDemandVariance,
      holding_cost: config.holdingCost,
      backorder_cost: config.backorderCost,
      current_demand:
        config.demandPattern === "fixed"
          ? config.fixedDemand
          : calculateNormalRandom(config.randomDemandMean, config.randomDemandVariance),
    })
    .select("id")
    .single()

  if (error) {
    console.error("Error creating game:", error)
    throw error
  }

  // Create AI players if configured
  for (const role of config.aiPlayers) {
    await addPlayer(game.id, role, `AI ${role.charAt(0).toUpperCase() + role.slice(1)}`, true)
  }

  return gameCode
}

export async function addPlayer(gameId: string, role: PlayerRole, name: string, isAI = false): Promise<void> {
  // Get game configuration
  const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).single()

  if (gameError) {
    console.error("Error fetching game:", gameError)
    throw gameError
  }

  // Create the player in the database
  const { error } = await supabase.from("players").insert({
    game_id: gameId,
    role,
    name,
    is_ai: isAI,
    inventory: game.initial_inventory,
    backlog: game.initial_backlog,
    pipeline_inventory:
      role === "retailer"
        ? game.retailer_lead_time * game.fixed_demand
        : role === "wholesaler"
          ? game.wholesaler_lead_time * game.fixed_demand
          : role === "distributor"
            ? game.distributor_lead_time * game.fixed_demand
            : game.manufacturer_lead_time * game.fixed_demand,
    incoming_order: game.fixed_demand,
    outgoing_order: game.fixed_demand,
    incoming_shipment: game.fixed_demand,
    outgoing_shipment: game.fixed_demand,
    next_week_incoming_shipment: game.fixed_demand,
    weekly_holding_cost: game.initial_inventory * game.holding_cost,
    weekly_backorder_cost: game.initial_backlog * game.backorder_cost,
    total_holding_cost: game.initial_inventory * game.holding_cost,
    total_backorder_cost: game.initial_backlog * game.backorder_cost,
    total_cost: game.initial_inventory * game.holding_cost + game.initial_backlog * game.backorder_cost,
    total_orders: game.fixed_demand,
    total_backorders: game.initial_backlog,
    total_inventory: game.initial_inventory,
    total_outgoing_orders: game.fixed_demand,
    total_outgoing_shipments: game.fixed_demand,
    order_variability: 0.0,
    min_order: game.fixed_demand,
    max_order: game.fixed_demand,
  })

  if (error) {
    console.error("Error adding player:", error)
    throw error
  }

  // Initialize orders in the pipeline
  const leadTime =
    role === "retailer"
      ? game.retailer_lead_time
      : role === "wholesaler"
        ? game.wholesaler_lead_time
        : role === "distributor"
          ? game.distributor_lead_time
          : game.manufacturer_lead_time

  const toRole =
    role === "retailer"
      ? "customer"
      : role === "wholesaler"
        ? "retailer"
        : role === "distributor"
          ? "wholesaler"
          : "distributor"

  // Add initial shipments in the pipeline
  for (let i = 1; i <= leadTime; i++) {
    await supabase.from("orders").insert({
      game_id: gameId,
      from_role: role,
      to_role: toRole,
      quantity: game.fixed_demand,
      week_placed: 1 - i, // These are orders placed before the game started
      week_delivered: 1 + (leadTime - i),
      is_delivered: false,
    })
  }

  // If this is the manufacturer, also add initial orders to the factory
  if (role === "manufacturer") {
    for (let i = 1; i <= leadTime; i++) {
      await supabase.from("orders").insert({
        game_id: gameId,
        from_role: "factory",
        to_role: role,
        quantity: game.fixed_demand,
        week_placed: 1 - i, // These are orders placed before the game started
        week_delivered: 1 + (leadTime - i),
        is_delivered: false,
      })
    }
  }
}

export async function startGame(gameId: string): Promise<void> {
  console.log(`Starting game with ID: ${gameId}`)

  try {
    // First check if the game exists and is in the waiting state
    const { data: game, error: checkError } = await supabase
      .from("games")
      .select("id, status")
      .eq("id", gameId)
      .single()

    if (checkError) {
      console.error("Error checking game status:", checkError)
      throw new Error(`Failed to check game status: ${checkError.message}`)
    }

    if (!game) {
      throw new Error(`Game with ID ${gameId} not found`)
    }

    if (game.status !== "waiting") {
      console.warn(`Game is already in ${game.status} state, not starting`)
      return // Game is already started or completed
    }

    console.log("Game found and in waiting state, updating to active")

    // Update game status to active
    const { error } = await supabase.from("games").update({ status: "active" }).eq("id", gameId)

    if (error) {
      console.error("Error starting game:", error)
      throw new Error(`Failed to start game: ${error.message}`)
    }

    console.log("Game status updated to active, initializing first week data")

    // Initialize the first week's data
    await recordGameWeek(gameId)

    console.log("Game successfully started")
  } catch (error) {
    console.error("Error in startGame function:", error)
    throw error
  }
}

export async function placeOrder(gameId: string, role: PlayerRole, quantity: number): Promise<void> {
  try {
    console.log(`Placing order for ${role} in game ${gameId}: quantity=${quantity}`)
    
    // Get game data
    const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).single()

    if (gameError) {
      console.error("Error fetching game:", gameError)
      throw gameError
    }

    if (!game) {
      console.error("Game not found:", gameId)
      throw new Error(`Game not found: ${gameId}`)
    }

    // Get player data
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", gameId)
      .eq("role", role)
      .single()

    if (playerError) {
      console.error("Error fetching player:", playerError)
      throw playerError
    }

    if (!player) {
      console.error("Player not found:", role)
      throw new Error(`Player not found: ${role}`)
    }

    // Check if order already placed
    if (player.outgoing_order !== null) {
      console.log(`Player ${role} already placed an order: ${player.outgoing_order}`)
      return // Order already placed, don't do anything
    }

    // Ensure quantity is a valid number
    const safeQuantity = Number(quantity)
    if (isNaN(safeQuantity)) {
      console.error(`Invalid order quantity: ${quantity}`)
      throw new Error(`Invalid order quantity: ${quantity}`)
    }

    // Update player's outgoing order
    const { error: updateError } = await supabase
      .from("players")
      .update({
        outgoing_order: safeQuantity,
        total_outgoing_orders: (player.total_outgoing_orders || 0) + safeQuantity,
        min_order: Math.min(player.min_order || safeQuantity, safeQuantity),
        max_order: Math.max(player.max_order || safeQuantity, safeQuantity),
        // Update order variability (standard deviation of orders)
        order_variability: calculateOrderVariability(
          player.order_variability || 0,
          player.total_outgoing_orders || 0,
          player.outgoing_order || safeQuantity,
          safeQuantity,
        ),
      })
      .eq("id", player.id)

    if (updateError) {
      console.error("Error updating player order:", updateError)
      throw updateError
    }

    // Determine the recipient of the order
    const toRole =
      role === "retailer"
        ? "wholesaler"
        : role === "wholesaler"
          ? "distributor"
          : role === "distributor"
            ? "manufacturer"
            : "factory"

    // Create the order record
    const { error: orderError } = await supabase.from("orders").insert({
      game_id: gameId,
      from_role: role,
      to_role: toRole,
      quantity: safeQuantity,
      week_placed: game.current_week,
      week_delivered: game.current_week, // Orders are received immediately
      is_delivered: true, // The order is delivered immediately to the upstream player
    })

    if (orderError) {
      console.error("Error creating order:", orderError)
      throw orderError
    }

    // If the recipient is not 'factory', update their incoming order
    if (toRole !== "factory") {
      const { error: recipientError } = await supabase
        .from("players")
        .update({
          incoming_order: safeQuantity,
          total_orders: (player.total_orders || 0) + safeQuantity,
        })
        .eq("game_id", gameId)
        .eq("role", toRole)

      if (recipientError) {
        console.error("Error updating recipient:", recipientError)
        throw recipientError
      }
    }

    // Check if all players have placed orders for this week
    setTimeout(async () => {
      try {
        await checkAllOrdersPlaced(gameId)
      } catch (error) {
        console.error("Error in delayed checkAllOrdersPlaced:", error)
      }
    }, 500)
    
    console.log(`Order placed successfully for ${role}: ${safeQuantity}`)
  } catch (error) {
    console.error("Error in placeOrder:", error)
    throw error
  }
}

async function checkAllOrdersPlaced(gameId: string): Promise<void> {
  try {
    console.log("Checking if all orders have been placed for game:", gameId)
    
    // Get game data
    const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).single()

    if (gameError) {
      console.error("Error fetching game:", gameError)
      throw gameError
    }
    
    if (!game || game.status !== "active") {
      console.log("Game is not active, skipping order check")
      return
    }

    // Check if the game is already in the process of advancing to the next week
    // by looking for a temporary flag in the database
    const { data: advancingGame, error: advancingError } = await supabase
      .from("games")
      .select("is_advancing_week")
      .eq("id", gameId)
      .single()
      
    if (!advancingError && advancingGame && advancingGame.is_advancing_week) {
      console.log("Game is already advancing to next week, skipping duplicate processing")
      return
    }
    
    // Set the flag to indicate this game is being processed
    await supabase.from("games")
      .update({ is_advancing_week: true })
      .eq("id", gameId)

    try {
      // Get all players
      const { data: players, error: playersError } = await supabase.from("players").select("*").eq("game_id", gameId)

      if (playersError) {
        console.error("Error fetching players:", playersError)
        // Reset the advancing flag before exiting
        await supabase.from("games").update({ is_advancing_week: false }).eq("id", gameId)
        throw playersError
      }
      
      if (!players || players.length === 0) {
        console.log("No players found for game, skipping order check")
        // Reset the advancing flag before exiting
        await supabase.from("games").update({ is_advancing_week: false }).eq("id", gameId)
        return
      }
      
      // Debug log to check all players and their orders
      console.log("Players in game:", players.map(p => ({
        role: p.role,
        is_ai: p.is_ai,
        outgoing_order: p.outgoing_order,
        name: p.name
      })))

      // Check how many players have placed orders
      const humanPlayers = players.filter(p => !p.is_ai)
      const humanPlayersWithOrders = humanPlayers.filter(p => p.outgoing_order !== null)
      
      console.log(`${humanPlayersWithOrders.length} of ${humanPlayers.length} human players have placed orders`)

      // Check if all human players have placed orders
      const allOrdersPlaced = humanPlayers.every((player) => player.outgoing_order !== null)

      if (allOrdersPlaced) {
        console.log("All human players have placed orders, processing AI orders")
        
        // Process AI orders if any
        for (const player of players) {
          if (player.is_ai && player.outgoing_order === null) {
            try {
              // Simple AI strategy: order what was ordered from you
              const aiOrderQuantity = Math.max(player.incoming_order || 0, 0)
              console.log(`AI player ${player.role} placing order: ${aiOrderQuantity}`)
              await placeOrder(gameId, player.role as PlayerRole, aiOrderQuantity)
            } catch (aiError) {
              console.error(`Error processing AI order for ${player.role}:`, aiError)
              // Continue with other AI players
            }
          }
        }

        // Process shipments and advance to the next week
        console.log("Processing shipments and advancing week")
        try {
          await processShipments(gameId)
        } catch (shipmentError) {
          console.error("Error processing shipments:", shipmentError)
          // Continue to week advancement despite shipment errors
        }
        
        try {
          await advanceWeek(gameId)
          console.log("Week advanced successfully")
        } catch (advanceError) {
          console.error("Error advancing week:", advanceError)
          // Log the error but don't rethrow
        }
      } else {
        console.log("Still waiting for some players to place orders")
      }
    } finally {
      // Always reset the advancing flag, even if there was an error
      await supabase.from("games").update({ is_advancing_week: false }).eq("id", gameId)
    }
  } catch (error) {
    console.error("Error in checkAllOrdersPlaced:", error)
    // Try to reset the advancing flag if possible
    try {
      await supabase.from("games").update({ is_advancing_week: false }).eq("id", gameId)
    } catch (resetError) {
      console.error("Error resetting advancing flag:", resetError)
    }
    
    // Rethrow the original error
    throw error
  }
}

async function processShipments(gameId: string): Promise<void> {
  // Get game data
  const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).single()

  if (gameError) {
    console.error("Error fetching game:", gameError)
    throw gameError
  }

  // Get all players
  const { data: players, error: playersError } = await supabase.from("players").select("*").eq("game_id", gameId)

  if (playersError) {
    console.error("Error fetching players:", playersError)
    throw playersError
  }

  // Process each player's shipment
  for (const player of players) {
    const role = player.role as PlayerRole

    // Determine how much can be shipped
    const availableToShip = Math.min(player.incoming_order, player.inventory)
    const backloggedAmount = player.incoming_order - availableToShip

    // Update player's inventory, backlog, and outgoing shipment
    const { error: updateError } = await supabase
      .from("players")
      .update({
        inventory: player.inventory - availableToShip,
        backlog: player.backlog + backloggedAmount,
        outgoing_shipment: availableToShip,
        total_outgoing_shipments: player.total_outgoing_shipments + availableToShip,
        total_backorders: player.total_backorders + backloggedAmount,
      })
      .eq("id", player.id)

    if (updateError) {
      console.error("Error updating player shipment:", updateError)
      throw updateError
    }

    // Determine the recipient of the shipment
    const toRole =
      role === "retailer"
        ? "customer"
        : role === "wholesaler"
          ? "retailer"
          : role === "distributor"
            ? "wholesaler"
            : "distributor"

    // Calculate when the shipment will be delivered
    const leadTime =
      role === "retailer"
        ? game.retailer_lead_time
        : role === "wholesaler"
          ? game.wholesaler_lead_time
          : role === "distributor"
            ? game.distributor_lead_time
            : game.manufacturer_lead_time

    const deliveryWeek = game.current_week + leadTime

    // Create the shipment record (as an order)
    const { error: shipmentError } = await supabase.from("orders").insert({
      game_id: gameId,
      from_role: role,
      to_role: toRole,
      quantity: availableToShip,
      week_placed: game.current_week,
      week_delivered: deliveryWeek,
      is_delivered: false,
    })

    if (shipmentError) {
      console.error("Error creating shipment:", shipmentError)
      throw shipmentError
    }

    // If the recipient is not 'customer', update their next_week_incoming_shipment
    if (toRole !== "customer") {
      // Find the player who will receive this shipment
      const recipientPlayer = players.find((p) => p.role === toRole)

      if (recipientPlayer) {
        // Check if this shipment will arrive next week
        if (leadTime === 1) {
          const { error: recipientError } = await supabase
            .from("players")
            .update({
              next_week_incoming_shipment: availableToShip,
            })
            .eq("id", recipientPlayer.id)

          if (recipientError) {
            console.error("Error updating recipient shipment:", recipientError)
            throw recipientError
          }
        }
      }
    }
  }

  // Handle factory production for manufacturer
  const manufacturer = players.find((p) => p.role === "manufacturer")
  if (manufacturer) {
    // Factory always produces what was ordered by the manufacturer
    const { error: factoryError } = await supabase.from("orders").insert({
      game_id: gameId,
      from_role: "factory",
      to_role: "manufacturer",
      quantity: manufacturer.outgoing_order,
      week_placed: game.current_week,
      week_delivered: game.current_week + game.manufacturer_lead_time,
      is_delivered: false,
    })

    if (factoryError) {
      console.error("Error creating factory production:", factoryError)
      throw factoryError
    }

    // Update manufacturer's next week incoming shipment if lead time is 1
    if (game.manufacturer_lead_time === 1) {
      const { error: updateError } = await supabase
        .from("players")
        .update({
          next_week_incoming_shipment: manufacturer.outgoing_order,
        })
        .eq("id", manufacturer.id)

      if (updateError) {
        console.error("Error updating manufacturer shipment:", updateError)
        throw updateError
      }
    }
  }
}

async function advanceWeek(gameId: string): Promise<void> {
  // Get game data
  const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).single()

  if (gameError) {
    console.error("Error fetching game:", gameError)
    throw gameError
  }

  // Check if we've reached the end of the game
  if (game.current_week >= game.total_weeks) {
    // End the game
    const { error } = await supabase.from("games").update({ status: "completed" }).eq("id", gameId)

    if (error) {
      console.error("Error ending game:", error)
      throw error
    }

    return
  }

  // Get all players
  const { data: players, error: playersError } = await supabase.from("players").select("*").eq("game_id", gameId)

  if (playersError) {
    console.error("Error fetching players:", playersError)
    throw playersError
  }

  // Get all orders that are due to be delivered in the next week
  const nextWeek = game.current_week + 1
  const { data: deliveries, error: deliveriesError } = await supabase
    .from("orders")
    .select("*")
    .eq("game_id", gameId)
    .eq("week_delivered", nextWeek)
    .eq("is_delivered", false)

  if (deliveriesError) {
    console.error("Error fetching deliveries:", deliveriesError)
    throw deliveriesError
  }

  // Calculate the next week's demand based on the pattern
  let nextDemand = game.fixed_demand
  if (game.demand_pattern === "random") {
    nextDemand = calculateNormalRandom(game.random_demand_mean, game.random_demand_variance)
  } else if (game.demand_pattern === "step") {
    // For step pattern, we'll use a step at week 5
    nextDemand = calculateStepDemand(nextWeek, game.fixed_demand, 5, 4)
  }

  // Update the game with the new week and demand
  const { error: updateGameError } = await supabase
    .from("games")
    .update({
      current_week: nextWeek,
      current_demand: nextDemand,
    })
    .eq("id", gameId)

  if (updateGameError) {
    console.error("Error updating game week:", updateGameError)
    throw updateGameError
  }

  // Process deliveries for each player
  for (const player of players) {
    const role = player.role as PlayerRole

    try {
      // Find incoming shipments for this player
      const incomingShipments = deliveries.filter((d) => d.to_role === role)
      const totalIncoming = incomingShipments.reduce((sum, d) => sum + d.quantity, 0)

      // Find incoming orders for this player based on role
      let incomingOrder = 0
      
      if (role === "retailer") {
        // Retailer receives customer demand
        incomingOrder = nextDemand
      } else {
        // Find the player that would order from this player (downstream in the supply chain)
        const downstreamRole = getDownstreamRole(role)
        if (downstreamRole !== "customer") {
          const downstreamPlayer = players.find(p => p.role === downstreamRole)
          if (downstreamPlayer) {
            // If downstream player placed an order, use it (or default to fixed demand)
            incomingOrder = downstreamPlayer.outgoing_order !== null ? 
              downstreamPlayer.outgoing_order : game.fixed_demand
          }
        }
      }
      
      // Calculate pipeline inventory safely
      let pipelineInventory = 0
      try {
        pipelineInventory = await calculatePipelineInventory(deliveries, role, gameId)
      } catch (pipelineError) {
        console.error(`Error calculating pipeline inventory for ${role}:`, pipelineError)
        // Continue with 0 pipeline inventory on error, rather than failing the whole process
      }

      // Make sure values are valid numbers
      const safeInventory = player.inventory || 0
      const safeTotalIncoming = Number(totalIncoming) || 0
      const safeTotalInventory = player.total_inventory || 0
      
      // Create update data object
      const updateData = {
        incoming_shipment: safeTotalIncoming,
        incoming_order: Number(incomingOrder) || 0,
        outgoing_order: null,
        inventory: safeInventory + safeTotalIncoming,
        pipeline_inventory: Number(pipelineInventory) || 0,
        total_inventory: safeTotalInventory + safeTotalIncoming,
      }

      console.log(`Updating player ${role} with data:`, JSON.stringify(updateData))

      try {
        // Try to update the player with retry logic
        let retryCount = 0
        let updateSuccess = false
        let resetError = null

        while (retryCount < 3 && !updateSuccess) {
          const { error } = await supabase
            .from("players")
            .update(updateData)
            .eq("id", player.id)

          if (error) {
            resetError = error
            console.error(`Error updating player ${role} (attempt ${retryCount + 1}):`, error)
            retryCount++
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 500))
          } else {
            updateSuccess = true
            break
          }
        }

        if (!updateSuccess) {
          console.error(`Failed to update player ${role} after ${retryCount} attempts:`, resetError)
          // Continue with other players rather than failing completely
          continue
        }
      } catch (unexpectedError) {
        console.error(`Unexpected error updating player ${role}:`, unexpectedError)
        // Continue with other players rather than failing completely
        continue
      }

      // Mark the deliveries as delivered
      for (const delivery of incomingShipments) {
        try {
          const { error: markError } = await supabase.from("orders").update({ is_delivered: true }).eq("id", delivery.id)

          if (markError) {
            console.error("Error marking delivery as delivered:", markError)
            // Continue with other deliveries
          }
        } catch (deliveryError) {
          console.error(`Error processing delivery for ${role}:`, deliveryError)
          // Continue with other deliveries
        }
      }

      // Calculate and update costs
      try {
        await updatePlayerCosts(player.id)
      } catch (costError) {
        console.error(`Error updating costs for player ${role}:`, costError)
        // Continue with other players
      }
    } catch (playerError) {
      console.error(`Error processing player ${role} in advanceWeek:`, playerError)
      // Continue with other players rather than failing completely
    }
  }

  // Record the game state for this week
  try {
    await recordGameWeek(gameId)
  } catch (recordError) {
    console.error("Error recording game week:", recordError)
    // Continue despite record error
  }
}

// Helper function to get the downstream role in the supply chain
function getDownstreamRole(role: PlayerRole): PlayerRole | "customer" {
  switch (role) {
    case "wholesaler": return "retailer"
    case "distributor": return "wholesaler"
    case "manufacturer": return "distributor"
    default: return "customer"
  }
}

async function calculatePipelineInventory(deliveries: any[], role: PlayerRole, gameId: string): Promise<number> {
  try {
  // Get all undelivered orders that this player has placed
  const { data: pendingOrders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("game_id", gameId)
    .eq("from_role", role)
    .eq("is_delivered", false)

  if (error) {
      console.error(`Error fetching pending orders for ${role}:`, error)
      // Return a default value rather than throwing an error that could break the week advancement
      return 0
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return 0
    }

    // Sum up the quantities and ensure we don't return NaN
    const pipelineTotal = pendingOrders.reduce((sum, order) => sum + (Number(order.quantity) || 0), 0)
    return isNaN(pipelineTotal) ? 0 : pipelineTotal
  } catch (error) {
    console.error(`Error calculating pipeline inventory for ${role}:`, error)
    // Return a default value rather than throwing an error
    return 0
  }
}

async function updatePlayerCosts(playerId: string): Promise<void> {
  try {
  // Get player data
  const { data: player, error: playerError } = await supabase.from("players").select("*").eq("id", playerId).single()

  if (playerError) {
      console.error("Error fetching player for cost update:", playerError)
      return // Return rather than throwing to prevent breaking game advancement
    }

    if (!player) {
      console.error("Player not found for cost update:", playerId)
      return
  }

  // Get game data to get cost parameters
  const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", player.game_id).single()

  if (gameError) {
      console.error("Error fetching game for cost update:", gameError)
      return // Return rather than throwing
    }

    if (!game) {
      console.error("Game not found for cost update:", player.game_id)
      return
  }

  // Calculate weekly costs
    const inventory = player.inventory || 0
    const backlog = player.backlog || 0
    const holdingCost = game.holding_cost || 0.5
    const backorderCost = game.backorder_cost || 1.0

    const weeklyHoldingCost = inventory * holdingCost
    const weeklyBackorderCost = backlog * backorderCost
    
    // Ensure all values are valid numbers
    const totalHoldingCost = (player.total_holding_cost || 0) + weeklyHoldingCost
    const totalBackorderCost = (player.total_backorder_cost || 0) + weeklyBackorderCost
    const totalCost = (player.total_cost || 0) + weeklyHoldingCost + weeklyBackorderCost

  // Update player costs
  const { error: updateError } = await supabase
    .from("players")
    .update({
      weekly_holding_cost: weeklyHoldingCost,
      weekly_backorder_cost: weeklyBackorderCost,
        total_holding_cost: totalHoldingCost,
        total_backorder_cost: totalBackorderCost,
      total_cost: totalCost,
    })
    .eq("id", playerId)

  if (updateError) {
    console.error("Error updating player costs:", updateError)
      return // Return rather than throwing
  }

    try {
  // Update total team cost in the game
  const { data: allPlayers, error: allPlayersError } = await supabase
    .from("players")
    .select("total_cost")
    .eq("game_id", player.game_id)

      if (allPlayersError || !allPlayers) {
        console.error("Error fetching all players for team cost update:", allPlayersError)
        return // Skip team cost update rather than failing
      }

      const totalTeamCost = allPlayers.reduce((sum, p) => sum + (p.total_cost || 0), 0)

  const { error: updateGameError } = await supabase
    .from("games")
    .update({ total_team_cost: totalTeamCost })
    .eq("id", player.game_id)

  if (updateGameError) {
    console.error("Error updating game total cost:", updateGameError)
        // Continue execution despite error
      }
    } catch (teamCostError) {
      console.error("Error in team cost calculation:", teamCostError)
      // Continue execution despite error
    }
  } catch (overallError) {
    console.error("Unexpected error in updatePlayerCosts:", overallError)
    // Return without throwing to prevent breaking game advancement
  }
}

async function recordGameWeek(gameId: string): Promise<void> {
  // Get game data
  const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).single()

  if (gameError) {
    console.error("Error fetching game:", gameError)
    throw gameError
  }

  // Get all players
  const { data: players, error: playersError } = await supabase.from("players").select("*").eq("game_id", gameId)

  if (playersError) {
    console.error("Error fetching players:", playersError)
    throw playersError
  }

  // Find each role
  const retailer = players.find((p) => p.role === "retailer")
  const wholesaler = players.find((p) => p.role === "wholesaler")
  const distributor = players.find((p) => p.role === "distributor")
  const manufacturer = players.find((p) => p.role === "manufacturer")

  if (!retailer || !wholesaler || !distributor || !manufacturer) {
    console.error("Missing one or more players")
    return
  }

  // Record the game week
  const { error } = await supabase.from("game_weeks").insert({
    game_id: gameId,
    week_number: game.current_week,
    retailer_inventory: retailer.inventory,
    retailer_backlog: retailer.backlog,
    retailer_order: retailer.outgoing_order || 0,
    retailer_shipment: retailer.outgoing_shipment,
    wholesaler_inventory: wholesaler.inventory,
    wholesaler_backlog: wholesaler.backlog,
    wholesaler_order: wholesaler.outgoing_order || 0,
    wholesaler_shipment: wholesaler.outgoing_shipment,
    distributor_inventory: distributor.inventory,
    distributor_backlog: distributor.backlog,
    distributor_order: distributor.outgoing_order || 0,
    distributor_shipment: distributor.outgoing_shipment,
    manufacturer_inventory: manufacturer.inventory,
    manufacturer_backlog: manufacturer.backlog,
    manufacturer_order: manufacturer.outgoing_order || 0,
    manufacturer_shipment: manufacturer.outgoing_shipment,
    customer_demand: game.current_demand,
  })

  if (error) {
    console.error("Error recording game week:", error)
    throw error
  }
}

function calculateOrderVariability(
  currentVariability: number,
  totalOrders: number,
  previousOrder: number,
  newOrder: number,
): number {
  // If this is the first order, there's no variability yet
  if (totalOrders <= 1) return 0

  // Simple standard deviation calculation
  // This is a simplified approach - in a real implementation you'd want to store all orders
  // and calculate the standard deviation properly
  const avgOrder = (totalOrders * previousOrder + newOrder) / (totalOrders + 1)
  const variance =
    (currentVariability * currentVariability * (totalOrders - 1) + Math.pow(newOrder - avgOrder, 2)) / totalOrders

  return Math.sqrt(variance)
}

// NEW FUNCTION: Get game by ID (UUID)
export async function getGameById(gameId: string): Promise<GameState | null> {
  console.log("Getting game by ID:", gameId)

  try {
    // Get game data directly by ID
    const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).single()

    if (gameError) {
      if (gameError.code === "PGRST116") {
        console.log("No game found with ID:", gameId)
        return null
      }
      console.error("Error fetching game by ID:", gameError)
      throw gameError
    }

    console.log("Game found by ID:", game)

    // Get all players
    const { data: players, error: playersError } = await supabase.from("players").select("*").eq("game_id", gameId)

    if (playersError) {
      console.error("Error fetching players:", playersError)
      throw playersError
    }

    console.log("Players found:", players)

    // Find each role
    const retailer = players.find((p) => p.role === "retailer") || createEmptyPlayerState("retailer")
    const wholesaler = players.find((p) => p.role === "wholesaler") || createEmptyPlayerState("wholesaler")
    const distributor = players.find((p) => p.role === "distributor") || createEmptyPlayerState("distributor")
    const manufacturer = players.find((p) => p.role === "manufacturer") || createEmptyPlayerState("manufacturer")

    // Convert to GameState format
    return {
      id: game.id,
      game_code: game.game_code,
      status: game.status,
      current_week: game.current_week,
      total_weeks: game.total_weeks,
      expected_demand: game.current_demand,
      total_team_cost: game.total_team_cost,
      retailer,
      wholesaler,
      distributor,
      manufacturer,
      created_at: game.created_at,
      updated_at: game.updated_at,
      initial_inventory: game.initial_inventory,
      initial_backlog: game.initial_backlog,
      retailer_lead_time: game.retailer_lead_time,
      wholesaler_lead_time: game.wholesaler_lead_time,
      distributor_lead_time: game.distributor_lead_time,
      manufacturer_lead_time: game.manufacturer_lead_time,
      demand_pattern: game.demand_pattern,
      fixed_demand: game.fixed_demand,
      random_demand_mean: game.random_demand_mean,
      random_demand_variance: game.random_demand_variance,
      holding_cost: game.holding_cost,
      backorder_cost: game.backorder_cost,
      current_demand: game.current_demand,
    }
  } catch (error) {
    console.error("Unexpected error in getGameById:", error)
    throw error
  }
}

export async function getGameByCode(gameCode: string): Promise<GameState | null> {
  console.log("Getting game by code:", gameCode)

  try {
    // Get game data
    const { data: game, error: gameError } = await supabase.from("games").select("*").eq("game_code", gameCode).single()

    if (gameError) {
      if (gameError.code === "PGRST116") {
        console.log("No game found with code:", gameCode)
        // No game found with this code
        return null
      }
      console.error("Error fetching game:", gameError)
      throw gameError
    }

    console.log("Game found:", game)

    // Get all players
    const { data: players, error: playersError } = await supabase.from("players").select("*").eq("game_id", game.id)

    if (playersError) {
      console.error("Error fetching players:", playersError)
      throw playersError
    }

    console.log("Players found:", players)

    // Find each role
    const retailer = players.find((p) => p.role === "retailer") || createEmptyPlayerState("retailer")
    const wholesaler = players.find((p) => p.role === "wholesaler") || createEmptyPlayerState("wholesaler")
    const distributor = players.find((p) => p.role === "distributor") || createEmptyPlayerState("distributor")
    const manufacturer = players.find((p) => p.role === "manufacturer") || createEmptyPlayerState("manufacturer")

    // Convert to GameState format
    return {
      id: game.id,
      game_code: game.game_code,
      status: game.status,
      current_week: game.current_week,
      total_weeks: game.total_weeks,
      expected_demand: game.current_demand,
      total_team_cost: game.total_team_cost,
      retailer,
      wholesaler,
      distributor,
      manufacturer,
      created_at: game.created_at,
      updated_at: game.updated_at,
      initial_inventory: game.initial_inventory,
      initial_backlog: game.initial_backlog,
      retailer_lead_time: game.retailer_lead_time,
      wholesaler_lead_time: game.wholesaler_lead_time,
      distributor_lead_time: game.distributor_lead_time,
      manufacturer_lead_time: game.manufacturer_lead_time,
      demand_pattern: game.demand_pattern,
      fixed_demand: game.fixed_demand,
      random_demand_mean: game.random_demand_mean,
      random_demand_variance: game.random_demand_variance,
      holding_cost: game.holding_cost,
      backorder_cost: game.backorder_cost,
      current_demand: game.current_demand,
    }
  } catch (error) {
    console.error("Unexpected error in getGameByCode:", error)
    throw error
  }
}

function createEmptyPlayerState(role: PlayerRole): PlayerState {
  const playerState: PlayerState = {
    role,
    inventory: 0,
    backlog: 0,
    pipeline_inventory: 0,
    incoming_order: 0,
    outgoing_order: null,
    incoming_shipment: 0,
    outgoing_shipment: 0,
    next_week_incoming_shipment: 0,
    weekly_holding_cost: 0,
    weekly_backorder_cost: 0,
    total_holding_cost: 0,
    total_backorder_cost: 0,
    total_cost: 0,
    total_orders: 0,
    total_backorders: 0,
    total_inventory: 0,
    total_outgoing_orders: 0,
    total_outgoing_shipments: 0,
    order_variability: 0,
    min_order: 0,
    max_order: 0,
    inventory_history: [],
    backlog_history: [],
    order_history: [],
    incoming_shipment_history: []
  };
  return playerState;
}

export async function getGamePlayers(gameId: string): Promise<Record<PlayerRole, string | null>> {
  // Get all players
  const { data: players, error } = await supabase.from("players").select("role, name").eq("game_id", gameId)

  if (error) {
    console.error("Error fetching players:", error)
    throw error
  }

  // Initialize result with all roles as null
  const result: Record<PlayerRole, string | null> = {
    retailer: null,
    wholesaler: null,
    distributor: null,
    manufacturer: null,
  }

  // Fill in the names for roles that have players
  for (const player of players) {
    result[player.role as PlayerRole] = player.name
  }

  return result
}

export async function checkRoleAvailable(gameId: string, role: PlayerRole): Promise<boolean> {
  // Check if the role is already taken
  const { data, error } = await supabase.from("players").select("id").eq("game_id", gameId).eq("role", role).single()

  if (error) {
    if (error.code === "PGRST116") {
      // No player found with this role, so it's available
      return true
    }
    console.error("Error checking role availability:", error)
    throw error
  }

  // Role is taken
  return false
}

// Debug function to diagnose game issues
export async function debugGame(gameId: string): Promise<any> {
  try {
    console.log("Running game debug for game ID:", gameId)
    
    // Get game data
    const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).single()

    if (gameError) {
      console.error("Debug - Error fetching game:", gameError)
      return { error: "Error fetching game", details: gameError }
    }

    if (!game) {
      console.error("Debug - Game not found")
      return { error: "Game not found" }
    }

    // Get all players
    const { data: players, error: playersError } = await supabase.from("players").select("*").eq("game_id", gameId)

    if (playersError) {
      console.error("Debug - Error fetching players:", playersError)
      return { error: "Error fetching players", details: playersError }
    }

    // Check if there's any player with an order issue
    const playerWithOrderIssue = players.find(p => 
      p.outgoing_order === null && !p.is_ai && 
      // Make sure the game is active
      game.status === "active"
    )

    let fixResult = null
    if (playerWithOrderIssue) {
      console.log(`Debug - Found player with order issue: ${playerWithOrderIssue.role}`)
      
      // Check if the game is stuck in advancing state
      if (game.is_advancing_week) {
        console.log("Debug - Game is stuck in advancing state, resetting flag")
        
        // Reset the game's advancing flag
        const { error: resetError } = await supabase
          .from("games")
          .update({ is_advancing_week: false })
          .eq("id", gameId)
          
        if (resetError) {
          console.error("Debug - Error resetting game advancing flag:", resetError)
        } else {
          console.log("Debug - Game advancing flag reset successfully")
          fixResult = "Reset advancing flag"
        }
      }
    }

    // Get pending orders
    const { data: pendingOrders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("game_id", gameId)
      .eq("is_delivered", false)

    if (ordersError) {
      console.error("Debug - Error fetching orders:", ordersError)
      return { 
        error: "Error fetching orders", 
        details: ordersError, 
        game, 
        players, 
        fixResult 
      }
    }

    return {
      game,
      players,
      pendingOrders,
      fixResult,
      playerWithOrderIssue: playerWithOrderIssue ? {
        role: playerWithOrderIssue.role,
        name: playerWithOrderIssue.name,
        is_ai: playerWithOrderIssue.is_ai,
        outgoing_order: playerWithOrderIssue.outgoing_order
      } : null
    }
  } catch (error) {
    console.error("Debug - Unexpected error:", error)
    return { error: "Unexpected error", details: error }
  }
}

// Reset player order to allow placing it again
export async function resetPlayerOrder(gameId: string, role: PlayerRole): Promise<boolean> {
  try {
    console.log(`Resetting order for ${role} in game ${gameId}`)
    
    // Reset the player's outgoing order
    const { error } = await supabase
      .from("players")
      .update({ outgoing_order: null })
      .eq("game_id", gameId)
      .eq("role", role)

    if (error) {
      console.error("Error resetting player order:", error)
      return false
    }
    
    console.log(`Successfully reset order for ${role}`)
    return true
  } catch (error) {
    console.error("Unexpected error in resetPlayerOrder:", error)
    return false
  }
}
