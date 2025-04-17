"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Info, DollarSign, TrendingDown, TrendingUp } from "lucide-react"
import type { PlayerState, GameState } from "@/lib/types"

interface CostBreakdownProps {
  gameState: GameState
  playerState: PlayerState
}

export function CostBreakdown({ gameState, playerState }: CostBreakdownProps) {
  const [activeTab, setActiveTab] = useState("current")
  
  // Calculate percentages for visualization
  const totalWeeklyCost = playerState.weekly_holding_cost + playerState.weekly_backorder_cost
  const holdingCostPercent = totalWeeklyCost > 0 
    ? Math.round((playerState.weekly_holding_cost / totalWeeklyCost) * 100) 
    : 0
  const backorderCostPercent = totalWeeklyCost > 0 
    ? Math.round((playerState.weekly_backorder_cost / totalWeeklyCost) * 100) 
    : 0
  
  // Calculate total costs
  const totalCumulativeCost = playerState.total_holding_cost + playerState.total_backorder_cost
  const holdingCostTotalPercent = totalCumulativeCost > 0
    ? Math.round((playerState.total_holding_cost / totalCumulativeCost) * 100)
    : 0
  const backorderCostTotalPercent = totalCumulativeCost > 0
    ? Math.round((playerState.total_backorder_cost / totalCumulativeCost) * 100)
    : 0
  
  // Calculate cost per unit
  const totalInventoryHandled = Math.max(1, playerState.total_inventory + playerState.total_backorders)
  const costPerUnit = playerState.total_cost / totalInventoryHandled
  
  return (
    <TooltipProvider>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Cost Breakdown
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Detailed breakdown of your costs</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full grid grid-cols-2">
              <TabsTrigger value="current">Current Week</TabsTrigger>
              <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Holding Cost</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cost = Inventory × {gameState.holding_cost} MAD per unit</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="text-lg font-bold">{playerState.weekly_holding_cost.toFixed(2)} MAD</div>
                    <div className="text-xs text-gray-500 flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {playerState.inventory} units × {gameState.holding_cost} MAD = {playerState.weekly_holding_cost.toFixed(2)} MAD
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${holdingCostPercent}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-right mt-1">{holdingCostPercent}% of weekly cost</div>
                  </div>
                  
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Backorder Cost</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cost = Backlog × {gameState.backorder_cost} MAD per unit</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="text-lg font-bold">{playerState.weekly_backorder_cost.toFixed(2)} MAD</div>
                    <div className="text-xs text-gray-500 flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {playerState.backlog} units × {gameState.backorder_cost} MAD = {playerState.weekly_backorder_cost.toFixed(2)} MAD
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 rounded-full" 
                        style={{ width: `${backorderCostPercent}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-right mt-1">{backorderCostPercent}% of weekly cost</div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Weekly Cost</span>
                    <span className="text-lg font-bold">{totalWeeklyCost.toFixed(2)} MAD</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {playerState.weekly_holding_cost.toFixed(2)} MAD (holding) + {playerState.weekly_backorder_cost.toFixed(2)} MAD (backorder)
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                    Reduce inventory holding costs by ordering closer to demand
                  </div>
                  <div className="flex items-center mt-1">
                    <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                    Reduce backorder costs by maintaining sufficient inventory
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="cumulative">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Total Holding Cost</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Accumulated holding costs across all weeks</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="text-lg font-bold">{playerState.total_holding_cost.toFixed(2)} MAD</div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${holdingCostTotalPercent}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-right mt-1">{holdingCostTotalPercent}% of total cost</div>
                  </div>
                  
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Total Backorder Cost</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Accumulated backorder costs across all weeks</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="text-lg font-bold">{playerState.total_backorder_cost.toFixed(2)} MAD</div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 rounded-full" 
                        style={{ width: `${backorderCostTotalPercent}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-right mt-1">{backorderCostTotalPercent}% of total cost</div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Cumulative Cost</span>
                    <span className="text-lg font-bold">{playerState.total_cost.toFixed(2)} MAD</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {playerState.total_holding_cost.toFixed(2)} MAD (holding) + {playerState.total_backorder_cost.toFixed(2)} MAD (backorder)
                  </div>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Cost per Unit</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total costs divided by total units handled (inventory + backorders)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-lg font-bold">{costPerUnit.toFixed(2)} MAD/unit</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Lower values indicate more efficient operations
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    Your cost efficiency trend: {
                      playerState.total_holding_cost > playerState.total_backorder_cost 
                        ? "Focus on reducing inventory levels" 
                        : "Focus on improving order fulfillment"
                    }
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
} 