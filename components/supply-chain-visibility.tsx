"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GameState, PlayerRole } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Eye, 
  EyeOff, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  History, 
  ArrowRight 
} from "lucide-react"

interface SupplyChainVisibilityProps {
  gameState: GameState
  playerRole: PlayerRole
}

export function SupplyChainVisibility({ gameState, playerRole }: SupplyChainVisibilityProps) {
  const [visibilityLevel, setVisibilityLevel] = useState<"basic" | "enhanced" | "full">("basic")
  const [activeTab, setActiveTab] = useState<"inventory" | "orders" | "pipeline">("inventory")
  
  // Determine which roles the player can see based on visibility level
  const getVisibleRoles = (): PlayerRole[] => {
    const roles: PlayerRole[] = ["retailer", "wholesaler", "distributor", "manufacturer"]
    const roleIndex = roles.indexOf(playerRole)
    
    switch (visibilityLevel) {
      case "basic":
        // Basic: Can only see adjacent roles (direct supplier and customer)
        return roles.filter((_, index) => 
          Math.abs(index - roleIndex) <= 1
        )
      case "enhanced":
        // Enhanced: Can see two tiers up and down
        return roles.filter((_, index) => 
          Math.abs(index - roleIndex) <= 2
        )
      case "full":
        // Full: Can see all roles
        return roles
    }
  }
  
  const visibleRoles = getVisibleRoles()
  
  // Calculate the fulfillment rate for a role
  const calculateFulfillmentRate = (role: PlayerRole) => {
    const player = gameState[role]
    return player.total_orders > 0
      ? Math.round(((player.total_orders - player.total_backorders) / player.total_orders) * 100)
      : 100
  }
  
  // Calculate the order variability for a role
  const getOrderVariability = (role: PlayerRole) => {
    return gameState[role].order_variability || 1.0
  }
  
  // Determine if a role is visible at the current visibility level
  const isRoleVisible = (role: PlayerRole) => {
    return visibleRoles.includes(role)
  }
  
  // Format data based on visibility level (blur or hide data for non-visible roles)
  const formatData = (role: PlayerRole, value: number | string) => {
    if (isRoleVisible(role)) {
      return value
    }
    return visibilityLevel === "basic" ? "?" : "~" + value
  }
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Supply Chain Visibility
          <div className="flex items-center space-x-2">
            <Button 
              variant={visibilityLevel === "basic" ? "default" : "outline"} 
              size="sm"
              onClick={() => setVisibilityLevel("basic")}
              className="flex items-center"
            >
              <EyeOff className="h-4 w-4 mr-1" />
              Basic
            </Button>
            <Button 
              variant={visibilityLevel === "enhanced" ? "default" : "outline"} 
              size="sm"
              onClick={() => setVisibilityLevel("enhanced")}
              className="flex items-center"
            >
              <Eye className="h-4 w-4 mr-1" />
              Enhanced
            </Button>
            <Button 
              variant={visibilityLevel === "full" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setVisibilityLevel("full")}
              className="flex items-center"
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Full
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4 w-full grid grid-cols-3">
            <TabsTrigger value="inventory" className="flex items-center">
              <Package className="h-4 w-4 mr-1" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center">
              <History className="h-4 w-4 mr-1" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center">
              <ArrowRight className="h-4 w-4 mr-1" />
              Pipeline
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="inventory">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Role</th>
                    <th className="p-2 text-center">Inventory</th>
                    <th className="p-2 text-center">Backlog</th>
                    <th className="p-2 text-center">Fulfillment Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {["retailer", "wholesaler", "distributor", "manufacturer"].map((role) => (
                    <tr 
                      key={role} 
                      className={`border-t ${role === playerRole ? "bg-purple-50" : ""}`}
                    >
                      <td className="p-2 capitalize">{role}</td>
                      <td className="p-2 text-center">{formatData(role as PlayerRole, gameState[role as PlayerRole].inventory)}</td>
                      <td className="p-2 text-center">{formatData(role as PlayerRole, gameState[role as PlayerRole].backlog)}</td>
                      <td className="p-2 text-center">{formatData(role as PlayerRole, calculateFulfillmentRate(role as PlayerRole) + "%")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
                {visibilityLevel === "basic" 
                  ? "Basic visibility only shows adjacent tiers. Upgrade visibility to see more of the supply chain." 
                  : visibilityLevel === "enhanced" 
                    ? "Enhanced visibility shows two tiers in each direction." 
                    : "Full visibility shows the entire supply chain."
                }
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="orders">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Role</th>
                    <th className="p-2 text-center">Current Order</th>
                    <th className="p-2 text-center">Incoming Order</th>
                    <th className="p-2 text-center">Order Variability</th>
                  </tr>
                </thead>
                <tbody>
                  {["retailer", "wholesaler", "distributor", "manufacturer"].map((role) => (
                    <tr 
                      key={role} 
                      className={`border-t ${role === playerRole ? "bg-purple-50" : ""}`}
                    >
                      <td className="p-2 capitalize">{role}</td>
                      <td className="p-2 text-center">{formatData(role as PlayerRole, gameState[role as PlayerRole].outgoing_order || "-")}</td>
                      <td className="p-2 text-center">{formatData(role as PlayerRole, gameState[role as PlayerRole].incoming_order)}</td>
                      <td className="p-2 text-center">{formatData(role as PlayerRole, getOrderVariability(role as PlayerRole).toFixed(1) + "x")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-purple-500 mr-1" />
                Order variability increases upstream. Lower variability leads to more efficient operations.
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="pipeline">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Role</th>
                    <th className="p-2 text-center">Pipeline Inventory</th>
                    <th className="p-2 text-center">Incoming Shipment</th>
                    <th className="p-2 text-center">Outgoing Shipment</th>
                  </tr>
                </thead>
                <tbody>
                  {["retailer", "wholesaler", "distributor", "manufacturer"].map((role) => (
                    <tr 
                      key={role} 
                      className={`border-t ${role === playerRole ? "bg-purple-50" : ""}`}
                    >
                      <td className="p-2 capitalize">{role}</td>
                      <td className="p-2 text-center">{formatData(role as PlayerRole, gameState[role as PlayerRole].pipeline_inventory)}</td>
                      <td className="p-2 text-center">{formatData(role as PlayerRole, gameState[role as PlayerRole].incoming_shipment)}</td>
                      <td className="p-2 text-center">{formatData(role as PlayerRole, gameState[role as PlayerRole].outgoing_shipment)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
              <div className="flex items-center">
                <Package className="h-4 w-4 text-blue-500 mr-1" />
                Pipeline inventory represents products in transit between supply chain tiers.
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold mb-2">Benefits of Information Sharing:</h3>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Reduced bullwhip effect and order variability</li>
            <li>Better inventory planning and management</li>
            <li>Improved customer service levels</li>
            <li>Lower overall supply chain costs</li>
            <li>More efficient resource utilization</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
} 