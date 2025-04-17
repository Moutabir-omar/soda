"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Info, ArrowUp, TrendingDown } from "lucide-react"
import { PlayerState, PlayerRole, GameState } from "@/lib/types"

interface OrderSmoothingProps {
  gameState: GameState
  role: PlayerRole
  currentOrderQuantity: number
  onUpdateOrderQuantity: (quantity: number) => void
}

export function OrderSmoothing({ 
  gameState, 
  role, 
  currentOrderQuantity,
  onUpdateOrderQuantity
}: OrderSmoothingProps) {
  const [strategy, setStrategy] = useState<"direct" | "moving-avg" | "exponential" | "forecast">("direct")
  const [smoothingFactor, setSmoothingFactor] = useState(50)
  const [recommendedOrder, setRecommendedOrder] = useState<number>(currentOrderQuantity)
  
  const playerState = gameState[role]
  
  // Whenever inputs change, recalculate the recommended order
  useEffect(() => {
    calculateRecommendedOrder()
  }, [strategy, smoothingFactor, playerState, currentOrderQuantity])
  
  // Calculate recommended order based on selected strategy
  const calculateRecommendedOrder = () => {
    const currentDemand = playerState.incoming_order
    const demandHistory = playerState.order_history || []
    
    // Use current stock position to adjust the order
    const currentInventory = playerState.inventory
    const currentBacklog = playerState.backlog
    const incomingShipment = playerState.incoming_shipment
    const pipelineInventory = playerState.pipeline_inventory
    
    // Define a safety stock based on lead time and demand variability
    const leadTime = role === "retailer" ? 
      gameState.retailer_lead_time || 1 : 
      role === "wholesaler" ? 
        gameState.wholesaler_lead_time || 1 : 
        role === "distributor" ? 
          gameState.distributor_lead_time || 2 : 
          gameState.manufacturer_lead_time || 2
    
    const safetyStock = Math.ceil(currentDemand * 0.2 * leadTime)
    
    // Normalized smoothing factor (0-1)
    const alpha = smoothingFactor / 100
    
    let order = currentDemand // Default to current demand
    
    switch (strategy) {
      case "direct":
        // Direct order matching with safety stock adjustment
        order = currentDemand
        break
        
      case "moving-avg":
        // Moving average of recent demands (last 3 periods)
        if (demandHistory.length > 0) {
          const recentDemands = [currentDemand, ...demandHistory.slice(0, 2)]
          order = Math.round(recentDemands.reduce((sum, val) => sum + val, 0) / recentDemands.length)
        }
        break
        
      case "exponential":
        // Exponential smoothing formula: αDt + (1-α)Ft-1
        if (demandHistory.length > 0) {
          const previousForecast = currentOrderQuantity
          order = Math.round(alpha * currentDemand + (1 - alpha) * previousForecast)
        }
        break
        
      case "forecast":
        // Forecast-based ordering with trend detection
        if (demandHistory.length >= 2) {
          // Simple trend detection
          const trend = currentDemand - demandHistory[0]
          // Forecast demand with trend
          const forecastDemand = currentDemand + (trend * alpha)
          order = Math.round(forecastDemand)
        }
        break
    }
    
    // Adjust for inventory position (current inventory + pipeline - backlog)
    const inventoryPosition = currentInventory + incomingShipment + pipelineInventory - currentBacklog
    const desiredInventory = currentDemand + safetyStock
    
    // Only adjust if we're significantly off from desired position
    if (Math.abs(inventoryPosition - desiredInventory) > 0.2 * desiredInventory) {
      // Adjust order by a portion of the gap, based on smoothing factor
      const adjustmentFactor = 0.3 + (alpha * 0.7) // Between 30% and 100% adjustment
      const inventoryAdjustment = Math.round((desiredInventory - inventoryPosition) * adjustmentFactor)
      order = Math.max(0, order + inventoryAdjustment)
    }
    
    setRecommendedOrder(order)
  }
  
  // Apply the recommended order
  const applyRecommendedOrder = () => {
    onUpdateOrderQuantity(recommendedOrder)
  }
  
  // Calculate the variability reduction
  const calculateVariabilityImpact = () => {
    // Variability reduction estimates for different strategies
    switch (strategy) {
      case "direct":
        return 0 // No reduction
      case "moving-avg":
        return 15 + Math.round(smoothingFactor / 5) // 15-35% reduction
      case "exponential":
        return 20 + Math.round(smoothingFactor / 4) // 20-45% reduction
      case "forecast":
        return 25 + Math.round(smoothingFactor / 3) // 25-58% reduction
    }
  }
  
  return (
    <TooltipProvider>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Order Smoothing Strategies
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Apply order smoothing strategies to reduce the bullwhip effect</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Select Smoothing Strategy</h3>
              <RadioGroup value={strategy} onValueChange={(v) => setStrategy(v as any)} className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="direct" id="direct" />
                    <Label htmlFor="direct" className="font-medium">Direct Ordering</Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">Order exactly what is demanded</p>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="moving-avg" id="moving-avg" />
                    <Label htmlFor="moving-avg" className="font-medium">Moving Average</Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">Order based on average of recent demands</p>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="exponential" id="exponential" />
                    <Label htmlFor="exponential" className="font-medium">Exponential Smoothing</Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">Weight recent demands more heavily</p>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="forecast" id="forecast" />
                    <Label htmlFor="forecast" className="font-medium">Forecast-Based</Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">Project future demand with trend analysis</p>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold">Smoothing Factor</h3>
                <span className="text-sm font-medium">{smoothingFactor}%</span>
              </div>
              <Slider
                value={[smoothingFactor]}
                onValueChange={(values) => setSmoothingFactor(values[0])}
                min={0}
                max={100}
                step={5}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>More Stable</span>
                <span>More Responsive</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm font-medium mb-1">Current Order</div>
                <div className="text-lg font-bold">{currentOrderQuantity} units</div>
                <div className="text-xs text-gray-500">Direct response to demand</div>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm font-medium mb-1">Recommended Order</div>
                <div className="text-lg font-bold">{recommendedOrder} units</div>
                <div className="text-xs text-gray-500">
                  Based on {strategy === "direct" ? "direct ordering" : 
                    strategy === "moving-avg" ? "moving average" : 
                    strategy === "exponential" ? "exponential smoothing" : "forecast"}
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1">Expected Bullwhip Reduction</div>
              <div className="flex items-center">
                <TrendingDown className="h-5 w-5 text-green-500 mr-2" />
                <div className="text-lg font-bold">{calculateVariabilityImpact()}% reduction in order variability</div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Lower variability reduces costs throughout the supply chain
              </div>
            </div>
            
            <Button 
              onClick={applyRecommendedOrder} 
              className="w-full"
              disabled={recommendedOrder === currentOrderQuantity}
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Apply Smoothed Order
            </Button>
            
            <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-1">How Smoothing Reduces Costs:</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Reduces inventory fluctuations across the supply chain</li>
                <li>Minimizes the risk of stockouts and excess inventory</li>
                <li>Creates more predictable ordering patterns</li>
                <li>Allows suppliers to plan more efficiently</li>
                <li>Lowers overall supply chain costs by 10-30%</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
} 