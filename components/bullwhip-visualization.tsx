"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { GameState, PlayerRole } from "@/lib/types"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts"

interface BullwhipVisualizationProps {
  gameState: GameState
}

export function BullwhipVisualization({ gameState }: BullwhipVisualizationProps) {
  const roles: PlayerRole[] = ["retailer", "wholesaler", "distributor", "manufacturer"]
  
  // Generate order variance data
  const generateOrderVarianceData = () => {
    const baseOrder = gameState.fixed_demand || gameState.current_demand || 4
    
    // Calculate order variance for each role
    const retailerVar = gameState.retailer.order_variability || 1.0
    const wholesalerVar = gameState.wholesaler.order_variability || Math.max(1.2, retailerVar * 1.2)
    const distributorVar = gameState.distributor.order_variability || Math.max(1.4, wholesalerVar * 1.2)
    const manufacturerVar = gameState.manufacturer.order_variability || Math.max(1.6, distributorVar * 1.2)
    
    // Create relative amplification scale
    const max = Math.max(retailerVar, wholesalerVar, distributorVar, manufacturerVar)
    
    return [
      { position: 1, role: "Customer", amplification: 1, variance: 1, absVariance: baseOrder * 0.05 },
      { position: 2, role: "Retailer", amplification: retailerVar / 1, variance: retailerVar, absVariance: baseOrder * 0.05 * retailerVar },
      { position: 3, role: "Wholesaler", amplification: wholesalerVar / retailerVar, variance: wholesalerVar, absVariance: baseOrder * 0.05 * wholesalerVar },
      { position: 4, role: "Distributor", amplification: distributorVar / wholesalerVar, variance: distributorVar, absVariance: baseOrder * 0.05 * distributorVar },
      { position: 5, role: "Manufacturer", amplification: manufacturerVar / distributorVar, variance: manufacturerVar, absVariance: baseOrder * 0.05 * manufacturerVar },
      { position: 6, role: "Factory", amplification: manufacturerVar / distributorVar * 1.1, variance: manufacturerVar * 1.1, absVariance: baseOrder * 0.05 * manufacturerVar * 1.1 }
    ]
  }
  
  // Generate sample orders over time to visualize the pattern
  const generateWavePatternsData = () => {
    // Base demand pattern with a small fluctuation
    const basePattern = Array.from({ length: 12 }, (_, i) => {
      const week = i + 1
      const baseOrder = gameState.fixed_demand || gameState.current_demand || 4
      const baseSine = Math.sin(i * 0.5) * 0.1 // Small 10% variation in consumer demand
      return baseOrder * (1 + baseSine)
    })
    
    // Create the data for the chart
    return Array.from({ length: 12 }, (_, i) => {
      const week = i + 1
      const retailerVar = gameState.retailer.order_variability || 1.0
      const wholesalerVar = gameState.wholesaler.order_variability || Math.max(1.2, retailerVar * 1.2)
      const distributorVar = gameState.distributor.order_variability || Math.max(1.4, wholesalerVar * 1.2)
      const manufacturerVar = gameState.manufacturer.order_variability || Math.max(1.6, distributorVar * 1.2)
      
      // Create waves with increasing amplitude as we move upstream
      return {
        week,
        customer: basePattern[i],
        retailer: basePattern[i] * (1 + Math.sin(i * 0.5) * 0.2),
        wholesaler: basePattern[i] * (1 + Math.sin(i * 0.45) * 0.35),
        distributor: basePattern[i] * (1 + Math.sin(i * 0.4) * 0.5),
        manufacturer: basePattern[i] * (1 + Math.sin(i * 0.35) * 0.7)
      }
    })
  }
  
  const orderVarianceData = generateOrderVarianceData()
  const wavePatternsData = generateWavePatternsData()
  
  return (
    <TooltipProvider>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Bullwhip Effect Visualization
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>The bullwhip effect is the phenomenon where order variability increases as we move upstream in the supply chain.</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Order Variability Amplification</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={orderVarianceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="role" 
                      label={{ value: "Supply Chain Position", position: "insideBottom", offset: -5 }} 
                    />
                    <YAxis 
                      label={{ value: "Relative Variability", angle: -90, position: "insideLeft" }} 
                    />
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => {
                        if (name === "variance") return [`${value.toFixed(2)}x customer variability`, "Variance"];
                        return [`${value.toFixed(2)}x amplification from previous tier`, "Amplification"];
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="variance" 
                      stroke="#8884d8" 
                      name="Order Variance" 
                      strokeWidth={2}
                      dot={{ r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amplification" 
                      stroke="#82ca9d" 
                      name="Stage Amplification" 
                      strokeWidth={2} 
                      dot={{ r: 5 }}
                    />
                    <ReferenceLine y={1} stroke="red" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-3 text-sm text-gray-600">
                <p>This chart shows how order variability increases as we move upstream in the supply chain.</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold mb-3">Order Pattern Visualization</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={wavePatternsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="week" 
                      label={{ value: "Week", position: "insideBottom", offset: -5 }} 
                    />
                    <YAxis 
                      label={{ value: "Order Quantity", angle: -90, position: "insideLeft" }} 
                    />
                    <RechartsTooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="customer" 
                      stroke="#e91e63" 
                      name="Customer" 
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="retailer" 
                      stroke="#9c27b0" 
                      name="Retailer" 
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="wholesaler" 
                      stroke="#3f51b5" 
                      name="Wholesaler" 
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="distributor" 
                      stroke="#2196f3" 
                      name="Distributor" 
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="manufacturer" 
                      stroke="#00bcd4" 
                      name="Manufacturer" 
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-3 text-sm text-gray-600">
                <p>This chart shows how small changes in customer demand get amplified throughout the supply chain.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold mb-2">How to Mitigate the Bullwhip Effect:</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Share demand information with upstream partners</li>
              <li>Implement order smoothing strategies (avoid large order changes)</li>
              <li>Reduce lead times where possible</li>
              <li>Maintain consistent ordering patterns</li>
              <li>Consider average demand over multiple periods</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
} 