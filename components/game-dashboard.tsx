"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GameState, PlayerRole, PlayerState } from "@/lib/types"
import { ArrowRight, TrendingUp, Package, AlertTriangle, CreditCard, Loader2, Info, BarChart2, History, Check } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { GameChart } from "./game-chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { OrderSmoothing } from "./order-smoothing"
import { Label } from "@/components/ui/label"

interface GameDashboardProps {
  gameState: GameState
  role: PlayerRole
  onPlaceOrder: (quantity: number) => Promise<void>
}

const MotionCard = motion(Card)

export function GameDashboard({ gameState, role, onPlaceOrder }: GameDashboardProps) {
  const [orderQuantity, setOrderQuantity] = useState<number>(gameState.current_demand || 4)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [hasPlacedOrderLocally, setHasPlacedOrderLocally] = useState(false)
  const [localCosts, setLocalCosts] = useState({
    inventory: 0,
    backlog: 0,
    weeklyHolding: 0,
    weeklyBackorder: 0,
    totalWeekly: 0,
    cumulative: 0
  })
  const [lastSeenWeek, setLastSeenWeek] = useState(gameState.current_week)

  const playerState = gameState[role]

  // Reset local state when week changes or game state updates
  useEffect(() => {
    if (playerState.outgoing_order === null || gameState.current_week !== lastSeenWeek) {
      console.log(`Dashboard state reset: Week changed from ${lastSeenWeek} to ${gameState.current_week} or order reset`)
      setHasPlacedOrderLocally(false)
      setIsSubmitting(false)
      // Reset order quantity to current demand or previous value if available
      setOrderQuantity(gameState.current_demand || playerState.incoming_order || 4)
      
      // Reset local costs to match game state
      setLocalCosts({
        inventory: playerState.inventory,
        backlog: playerState.backlog,
        weeklyHolding: playerState.weekly_holding_cost,
        weeklyBackorder: playerState.weekly_backorder_cost,
        totalWeekly: playerState.weekly_holding_cost + playerState.weekly_backorder_cost,
        cumulative: playerState.total_cost
      })
      
      // Update last seen week
      setLastSeenWeek(gameState.current_week)
    }
  }, [gameState.current_week, gameState.current_demand, playerState.outgoing_order, playerState.inventory, 
      playerState.backlog, playerState.weekly_holding_cost, playerState.weekly_backorder_cost, 
      playerState.total_cost, playerState.incoming_order, lastSeenWeek])

  // Add effect to check for other players' orders
  useEffect(() => {
    // Track other players' order status for visibility
    const otherPlayers = Object.entries(gameState)
      .filter(([key]) => ['retailer', 'wholesaler', 'distributor', 'manufacturer'].includes(key) && key !== role)
      .map(([key, value]) => ({ role: key, orderPlaced: (value as PlayerState).outgoing_order !== null }))
    
    console.log("Other players' order status:", otherPlayers)
  }, [gameState, role])

  // Calculate projected costs when order quantity changes
  useEffect(() => {
    // Always run this calculation, regardless of order placed status
    
    // Get actual cost values from the game
    const holdingCost = gameState.holding_cost || 0.5;
    const backorderCost = gameState.backorder_cost || 1.0;
    
    // -------- Calculate projections for CURRENT week's end state --------
    
    // Current values
    const currentInventory = playerState.inventory;
    const currentBacklog = playerState.backlog;
    const incomingShipment = playerState.incoming_shipment;
    const incomingDemand = playerState.incoming_order;
    
    // After receiving shipment
    const inventoryAfterReceiving = currentInventory + incomingShipment;
    
    // Calculate how much demand can be fulfilled
    const totalDemand = incomingDemand + currentBacklog;
    const amountFulfilled = Math.min(inventoryAfterReceiving, totalDemand);
    
    // Projected inventory and backlog
    const projectedInventory = Math.max(0, inventoryAfterReceiving - amountFulfilled);
    const projectedBacklog = Math.max(0, totalDemand - amountFulfilled);
    
    // Calculate costs
    const projectedHoldingCost = projectedInventory * holdingCost;
    const projectedBackorderCost = projectedBacklog * backorderCost;
    const totalWeeklyCost = projectedHoldingCost + projectedBackorderCost;
    const cumulativeCost = playerState.total_cost + totalWeeklyCost;
    
    // Debug logging
    console.log(`PROJECTION FOR ORDER ${orderQuantity}:`);
    console.log(`Starting inventory: ${currentInventory}, Incoming: +${incomingShipment}`);
    console.log(`Demand: ${incomingDemand}, Backlog: ${currentBacklog}`);
    console.log(`Can fulfill: ${amountFulfilled} of ${totalDemand} total demand`);
    console.log(`Projected inventory: ${projectedInventory}, Projected backlog: ${projectedBacklog}`);
    console.log(`Holding cost: ${projectedHoldingCost.toFixed(2)}, Backorder cost: ${projectedBackorderCost.toFixed(2)}`);
    console.log(`Weekly cost: ${totalWeeklyCost.toFixed(2)}, Cumulative: ${cumulativeCost.toFixed(2)}`);
    
    // Update local costs state with projections
    setLocalCosts({
      inventory: Math.round(projectedInventory),
      backlog: Math.round(projectedBacklog),
      weeklyHolding: projectedHoldingCost,
      weeklyBackorder: projectedBackorderCost,
      totalWeekly: totalWeeklyCost,
      cumulative: cumulativeCost
    });
    
  }, [orderQuantity, playerState.inventory, playerState.backlog, 
      playerState.incoming_order, playerState.incoming_shipment,
      gameState.holding_cost, gameState.backorder_cost, playerState.total_cost]);

  const handleSubmitOrder = async () => {
    // Check for already submitted order
    if (playerState.outgoing_order !== null) {
      console.log("Order already submitted in game state, showing placed UI")
      setHasPlacedOrderLocally(true)
      return
    }
    
    if (isSubmitting || hasPlacedOrderLocally) {
      console.log("Order already in progress or placed locally")
      return
    }
    
    setIsSubmitting(true)
    
    // Show the local UI update immediately
    setHasPlacedOrderLocally(true)
    
    try {
      console.log(`Submitting order for ${orderQuantity} units`)
      
      // Call onPlaceOrder and properly handle its result
      await onPlaceOrder(orderQuantity)
      console.log("Order submission completed successfully")
    } catch (error) {
      console.error("Error placing order:", error)
      // Even if there's an error, we'll keep the UI updated to show order placed
      // This helps with the case where the error is in week processing but order placement worked
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateFulfillmentRate = () => {
    if (playerState.total_orders === 0) return 100
    return Math.round(((playerState.total_orders - playerState.total_backorders) / playerState.total_orders) * 100)
  }

  // Check if order has been placed either locally or in the game state
  const hasPlacedOrder = hasPlacedOrderLocally || (playerState.outgoing_order !== null && playerState.outgoing_order !== 4)

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  // Add a dynamic inventory projection display
  const getOrderFeedback = () => {
    if (hasPlacedOrderLocally || playerState.outgoing_order !== null) return null;
    
    // Enhanced feedback that considers more factors
    const demandDiff = orderQuantity - playerState.incoming_order;
    const percentDiff = Math.round(Math.abs(demandDiff) / Math.max(1, playerState.incoming_order) * 100);
    
    // Consider pipeline inventory in our assessment
    const pipelineInventory = playerState.pipeline_inventory;
    const currentInventory = playerState.inventory;
    const currentBacklog = playerState.backlog;
    const incomingShipment = playerState.incoming_shipment;
    
    // Calculate projected inventory after receiving and fulfilling orders
    const projectedInventory = Math.max(0, currentInventory + incomingShipment - currentBacklog - playerState.incoming_order);
    
    // Calculate how many weeks of demand we can cover
    const weeksCovered = (projectedInventory + pipelineInventory) / Math.max(1, playerState.incoming_order);
    
    // Different feedback based on role and position in supply chain
    const feedbacks = [];
    
    // Inventory coverage feedback
    if (weeksCovered < 1) {
      feedbacks.push(
        <div key="coverage" className="text-sm text-red-600 mt-1">
          Warning: Current inventory and pipeline will cover less than 1 week of demand.
        </div>
      );
    } else if (weeksCovered > 3) {
      feedbacks.push(
        <div key="coverage" className="text-sm text-orange-600 mt-1">
          Note: Current inventory and pipeline will cover more than 3 weeks of demand.
        </div>
      );
    }
    
    // Order size feedback
    if (Math.abs(percentDiff) < 10) {
      feedbacks.push(
        <div key="order-match" className="text-sm text-green-600 mt-1">
          This order closely matches demand (within 10%).
        </div>
      );
    } else if (orderQuantity > playerState.incoming_order * 1.5) {
      feedbacks.push(
        <div key="order-high" className="text-sm text-orange-600 mt-1">
          Order is {percentDiff}% higher than current demand. This may cause excess inventory.
        </div>
      );
    } else if (orderQuantity < playerState.incoming_order * 0.7) {
      feedbacks.push(
        <div key="order-low" className="text-sm text-red-600 mt-1">
          Order is {percentDiff}% lower than current demand. This may cause backorders.
        </div>
      );
    }
    
    // Bullwhip effect mitigation advice
    if (role !== "retailer" && Math.abs(demandDiff) > playerState.incoming_order * 0.3) {
      feedbacks.push(
        <div key="bullwhip" className="text-sm text-purple-600 mt-1">
          Consider order smoothing to reduce variability in the supply chain.
        </div>
      );
    }
    
    return feedbacks.length > 0 ? (
      <div className="mt-2 border-t border-gray-200 pt-2">
        <div className="text-sm font-medium mb-1">Order Analysis:</div>
        {feedbacks}
      </div>
    ) : null;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MotionCard 
                className="bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3 }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
                    Inventory
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Current stock of soda cases in your warehouse
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div 
                    className="flex items-center"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    <Package className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="text-2xl font-bold">{playerState.inventory}</span>
                    <span className="text-sm text-gray-500 ml-1">cases</span>
                  </motion.div>
                </CardContent>
              </MotionCard>

              <MotionCard 
                className={cn(
                  "bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow",
                  playerState.backlog > 0 && "border-orange-300"
                )}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
                    Backorders
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Unfulfilled orders that need to be delivered
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div 
                    className="flex items-center"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    <AlertTriangle className={cn(
                      "h-5 w-5 mr-2",
                      playerState.backlog > 0 ? "text-orange-500" : "text-gray-400"
                    )} />
                    <span className="text-2xl font-bold">{playerState.backlog}</span>
                    <span className="text-sm text-gray-500 ml-1">cases</span>
                  </motion.div>
                </CardContent>
              </MotionCard>

              <MotionCard 
                className="bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
                    Pipeline
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Orders in transit from your supplier
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div 
                    className="flex items-center"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    <ArrowRight className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-2xl font-bold">{playerState.pipeline_inventory}</span>
                    <span className="text-sm text-gray-500 ml-1">cases</span>
                  </motion.div>
                </CardContent>
              </MotionCard>

              <MotionCard 
                className={cn(
                  "bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow",
                  calculateFulfillmentRate() < 80 && "border-red-300"
                )}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
                    Fulfillment
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Percentage of orders successfully fulfilled
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div 
                    className="flex items-center"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    <TrendingUp className={cn(
                      "h-5 w-5 mr-2",
                      calculateFulfillmentRate() >= 90 ? "text-green-500" :
                      calculateFulfillmentRate() >= 80 ? "text-yellow-500" : "text-red-500"
                    )} />
                    <span className="text-2xl font-bold">{calculateFulfillmentRate()}</span>
                    <span className="text-sm text-gray-500 ml-1">%</span>
                  </motion.div>
                </CardContent>
              </MotionCard>

              <MotionCard 
                className="bg-white/95 backdrop-blur-sm shadow-lg col-span-1 md:col-span-4"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-sara-gold">Player Status</CardTitle>
                  <CardDescription>
                    Current order status for Week {gameState.current_week}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    {['retailer', 'wholesaler', 'distributor', 'manufacturer'].map((playerRole) => {
                      const isCurrentPlayer = playerRole === role;
                      const player = gameState[playerRole as PlayerRole];
                      const hasPlaced = player && player.outgoing_order !== null;
                      
                      return (
                        <div key={playerRole} className={`flex items-center p-3 rounded-md ${
                          isCurrentPlayer ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                        }`}>
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            hasPlaced ? 'bg-green-500' : 'bg-orange-500'
                          }`}></div>
                          <div>
                            <div className="font-medium capitalize">
                              {playerRole} {isCurrentPlayer && "(You)"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {hasPlaced ? 'Order placed' : 'Waiting...'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </MotionCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MotionCard 
                className="bg-white/95 backdrop-blur-sm shadow-lg"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <CardHeader>
                  <CardTitle className="text-xl text-sara-gold">Weekly Summary</CardTitle>
                  <CardDescription>
                    Week {gameState.current_week} of {gameState.total_weeks}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        key={`incoming-${gameState.current_week}`}
                      >
                        <h4 className="text-sm font-medium text-gray-500">Incoming Order</h4>
                        <p className="text-lg font-semibold text-sara-purple">{playerState.incoming_order} cases</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        key={`outgoing-${gameState.current_week}`}
                      >
                        <h4 className="text-sm font-medium text-gray-500">Outgoing Shipment</h4>
                        <p className="text-lg font-semibold text-sara-purple">{playerState.outgoing_shipment} cases</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                        key={`incoming-ship-${gameState.current_week}`}
                      >
                        <h4 className="text-sm font-medium text-gray-500">Incoming Shipment</h4>
                        <p className="text-lg font-semibold text-sara-purple">{playerState.incoming_shipment} cases</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                        key={`order-${gameState.current_week}`}
                      >
                        <h4 className="text-sm font-medium text-gray-500">Your Last Order</h4>
                        <p className="text-lg font-semibold text-sara-purple">
                          {hasPlacedOrderLocally 
                            ? orderQuantity 
                            : playerState.outgoing_order !== null 
                              ? playerState.outgoing_order 
                              : "Not placed yet"}
                        </p>
                      </motion.div>
                    </div>

                    <motion.div 
                      className="pt-6 border-t"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 }}
                      key={`costs-${gameState.current_week}`}
                    >
                      <h4 className="text-sm font-medium text-gray-500 mb-4">Weekly Costs</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-5 w-5 text-sara-purple" />
                          <div>
                            <span className="text-gray-600 block text-sm">Holding Cost</span>
                            <span className="font-semibold text-sara-gold">
                              {hasPlacedOrderLocally 
                                ? localCosts.weeklyHolding.toFixed(2) 
                                : playerState.weekly_holding_cost.toFixed(2)} MAD
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-5 w-5 text-sara-purple" />
                          <div>
                            <span className="text-gray-600 block text-sm">Backorder Cost</span>
                            <span className="font-semibold text-sara-gold">
                              {hasPlacedOrderLocally 
                                ? localCosts.weeklyBackorder.toFixed(2) 
                                : playerState.weekly_backorder_cost.toFixed(2)} MAD
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5 text-sara-purple" />
                          <div>
                            <span className="text-gray-600 block text-sm">Total Weekly Cost</span>
                            <span className="font-semibold text-sara-gold">
                              {hasPlacedOrderLocally 
                                ? localCosts.totalWeekly.toFixed(2) 
                                : (playerState.weekly_holding_cost + playerState.weekly_backorder_cost).toFixed(2)} MAD
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Package className="h-5 w-5 text-sara-purple" />
                          <div>
                            <span className="text-gray-600 block text-sm">Cumulative Cost</span>
                            <span className="font-semibold text-sara-gold">
                              {hasPlacedOrderLocally 
                                ? localCosts.cumulative.toFixed(2) 
                                : playerState.total_cost.toFixed(2)} MAD
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
              </MotionCard>

              <MotionCard 
                className="bg-white/95 backdrop-blur-sm shadow-lg"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <CardHeader>
                  <CardTitle className="text-xl text-sara-gold">Place Your Order</CardTitle>
                  <CardDescription>
                    {hasPlacedOrder ? (
                      "Waiting for other players to place their orders..."
                    ) : (
                      "How many cases do you want to order from your supplier?"
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Add Order Smoothing component if not a retailer or based on game settings */}
                  {role !== "retailer" && (
                    <OrderSmoothing 
                      gameState={gameState} 
                      role={role} 
                      currentOrderQuantity={orderQuantity}
                      onUpdateOrderQuantity={setOrderQuantity}
                    />
                  )}
                  
                  <div className="flex items-end space-x-4">
                    <div className="flex-grow space-y-1">
                      <Label htmlFor="order-quantity" className="text-sm font-medium">
                        Order Quantity
                      </Label>
                      <Input
                        id="order-quantity"
                        type="number"
                        min="0"
                        value={orderQuantity}
                        onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 0)}
                        className="text-lg"
                        disabled={isSubmitting || hasPlacedOrder}
                      />
                      {getOrderFeedback()}
                    </div>
                      <Button
                      onClick={handleSubmitOrder}
                      disabled={isSubmitting || hasPlacedOrder}
                      className="h-12 px-6"
                      >
                        {isSubmitting ? (
                          <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : hasPlacedOrder ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Order Placed
                          </>
                        ) : (
                        <>
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Place Order
                        </>
                        )}
                      </Button>
                  </div>
                </CardContent>
              </MotionCard>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <MotionCard 
              className="bg-white/95 backdrop-blur-sm shadow-lg"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3 }}
            >
              <CardHeader>
                <CardTitle className="text-xl text-sara-gold">Order History</CardTitle>
                <CardDescription>Track your past orders and their outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-500">
                    <div>Week</div>
                    <div>Order</div>
                    <div>Received</div>
                    <div>Status</div>
                  </div>
                  {Array.from({ length: gameState.current_week }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="grid grid-cols-4 gap-4 items-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="font-semibold">Week {i + 1}</div>
                      <div>{playerState.order_history?.[i] ?? "-"}</div>
                      <div>{playerState.incoming_shipment_history?.[i] ?? "-"}</div>
                      <div className={cn(
                        "text-sm font-medium",
                        playerState.backlog_history?.[i] > 0 ? "text-orange-500" : "text-green-500"
                      )}>
                        {playerState.backlog_history?.[i] > 0 ? "Backordered" : "Fulfilled"}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </MotionCard>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <GameChart gameState={gameState} role={role} />
            
            <MotionCard 
              className="bg-white/95 backdrop-blur-sm shadow-lg"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <CardHeader>
                <CardTitle className="text-xl text-sara-gold">Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators for your role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-500">Average Inventory</h4>
                    <p className="text-2xl font-bold text-sara-purple">
                      {playerState.inventory_history?.length 
                        ? Math.round(playerState.inventory_history.reduce((a: number, b: number) => a + b, 0) / playerState.inventory_history.length)
                        : 0} cases
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-500">Average Backorders</h4>
                    <p className="text-2xl font-bold text-sara-purple">
                      {playerState.backlog_history?.length 
                        ? Math.round(playerState.backlog_history.reduce((a: number, b: number) => a + b, 0) / playerState.backlog_history.length)
                        : 0} cases
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-500">Total Orders</h4>
                    <p className="text-2xl font-bold text-sara-purple">
                      {playerState.total_orders} cases
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-500">Total Backorders</h4>
                    <p className="text-2xl font-bold text-sara-purple">
                      {playerState.total_backorders} cases
                    </p>
                  </div>
                </div>
              </CardContent>
            </MotionCard>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
