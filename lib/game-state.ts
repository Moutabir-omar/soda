import type { GameState, PlayerState } from "./types"

const initialPlayerState: PlayerState = {
  inventory: 12,
  backlog: 0,
  pipelineInventory: 8,
  incomingOrder: 4,
  outgoingOrder: 4,
  incomingShipment: 4,
  outgoingShipment: 4,
  nextWeekIncomingShipment: 4,
  weeklyHoldingCost: 6.0,
  weeklyBackorderCost: 0.0,
  totalHoldingCost: 6.0,
  totalBackorderCost: 0.0,
  totalCost: 6.0,
  totalOrders: 4,
  totalBackorders: 0,
  totalInventory: 12,
  totalOutgoingOrders: 4,
  totalOutgoingShipments: 4,
  orderVariability: 0.0,
  minOrder: 4,
  maxOrder: 4,
}

export const initialGameState: GameState = {
  currentWeek: 1,
  totalWeeks: 26,
  expectedDemand: 4,
  totalTeamCost: 24.0,
  retailer: { ...initialPlayerState },
  wholesaler: { ...initialPlayerState },
  distributor: { ...initialPlayerState },
  manufacturer: { ...initialPlayerState },
}
