"use client"

import type { GameState, PlayerRole } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Package, AlertTriangle, TrendingUp } from "lucide-react"

interface SupplyChainDiagramProps {
  gameState: GameState
  currentRole: PlayerRole | null
}

export function SupplyChainDiagram({ gameState, currentRole }: SupplyChainDiagramProps) {
  const roles: PlayerRole[] = ["retailer", "wholesaler", "distributor", "manufacturer"]

  return (
    <div className="p-4 bg-white rounded-lg">
      <h2 className="text-xl font-bold mb-6 text-center text-sara-gold">Supply Chain Visualization</h2>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        {roles.map((role) => (
          <RoleNode key={role} role={role} gameState={gameState} isCurrentRole={role === currentRole} />
        ))}
      </div>

      <div className="hidden md:flex justify-between items-center px-16 mt-4">
        {roles.slice(0, -1).map((role, index) => (
          <FlowArrow
            key={`${role}-to-${roles[index + 1]}`}
            fromRole={role}
            toRole={roles[index + 1]}
            gameState={gameState}
          />
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center">
            <Package className="h-5 w-5 text-blue-500 mr-2" />
            <span>Inventory</span>
          </div>
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
            <span>Backorders</span>
          </div>
          <div className="flex items-center">
            <ArrowRight className="h-5 w-5 text-green-500 mr-2" />
            <span>Pipeline</span>
          </div>
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 text-purple-500 mr-2" />
            <span>Fulfillment Rate</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface RoleNodeProps {
  role: PlayerRole
  gameState: GameState
  isCurrentRole: boolean
}

function RoleNode({ role, gameState, isCurrentRole }: RoleNodeProps) {
  const playerState = gameState[role]
  const roleNames: Record<PlayerRole, string> = {
    retailer: "Retailer",
    wholesaler: "Wholesaler",
    distributor: "Distributor",
    manufacturer: "Manufacturer",
  }

  const calculateFulfillmentRate = () => {
    if (playerState.total_orders === 0) return 100
    return Math.round(((playerState.total_orders - playerState.total_backorders) / playerState.total_orders) * 100)
  }

  return (
    <Card className={`w-full md:w-48 ${isCurrentRole ? "border-2 border-sara-purple" : "border-sara-coral"}`}>
      <CardContent className="p-4">
        <h3 className="text-center font-bold mb-2 text-sara-gold">{roleNames[role]}</h3>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col items-center">
            <Package className="h-4 w-4 text-blue-500" />
            <span className="font-semibold">{playerState.inventory}</span>
            <span className="text-xs text-gray-500">Inventory</span>
          </div>

          <div className="flex flex-col items-center">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="font-semibold">{playerState.backlog}</span>
            <span className="text-xs text-gray-500">Backlog</span>
          </div>

          <div className="flex flex-col items-center">
            <ArrowRight className="h-4 w-4 text-green-500" />
            <span className="font-semibold">{playerState.pipeline_inventory}</span>
            <span className="text-xs text-gray-500">Pipeline</span>
          </div>

          <div className="flex flex-col items-center">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="font-semibold">{calculateFulfillmentRate()}%</span>
            <span className="text-xs text-gray-500">Fulfillment</span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-center">
          <div>Cost: {playerState.total_cost.toFixed(2)} MAD</div>
        </div>
      </CardContent>
    </Card>
  )
}

interface FlowArrowProps {
  fromRole: PlayerRole
  toRole: PlayerRole
  gameState: GameState
}

function FlowArrow({ fromRole, toRole, gameState }: FlowArrowProps) {
  const fromState = gameState[fromRole]
  const toState = gameState[toRole]

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center">
        <div className="text-xs text-gray-500 mr-1">Order: {toState.outgoing_order ?? "?"}</div>
        <div className="w-24 h-0.5 bg-orange-300"></div>
        <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-8 border-l-orange-300"></div>
      </div>

      <div className="flex items-center mt-1">
        <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-8 border-r-blue-300"></div>
        <div className="w-24 h-0.5 bg-blue-300"></div>
        <div className="text-xs text-gray-500 ml-1">Ship: {fromState.outgoing_shipment}</div>
      </div>
    </div>
  )
}
