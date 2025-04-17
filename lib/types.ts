export type PlayerRole = "retailer" | "wholesaler" | "distributor" | "manufacturer"

export interface PlayerState {
  id?: string
  game_id?: string
  role?: PlayerRole
  name?: string
  is_ai?: boolean
  inventory: number
  backlog: number
  pipeline_inventory: number
  incoming_order: number
  outgoing_order: number | null
  incoming_shipment: number
  outgoing_shipment: number
  next_week_incoming_shipment: number
  weekly_holding_cost: number
  weekly_backorder_cost: number
  total_holding_cost: number
  total_backorder_cost: number
  total_cost: number
  total_orders: number
  total_backorders: number
  total_inventory: number
  total_outgoing_orders: number
  total_outgoing_shipments: number
  order_variability: number
  min_order: number
  max_order: number
  created_at?: string
  updated_at?: string
  // History properties
  inventory_history: number[]
  backlog_history: number[]
  order_history: number[]
  incoming_shipment_history: number[]
}

export interface GameState {
  id?: string
  game_code?: string
  status?: string
  current_week: number
  total_weeks: number
  expected_demand: number
  total_team_cost: number
  retailer: PlayerState
  wholesaler: PlayerState
  distributor: PlayerState
  manufacturer: PlayerState
  created_at?: string
  updated_at?: string

  // Game configuration
  initial_inventory?: number
  initial_backlog?: number
  retailer_lead_time?: number
  wholesaler_lead_time?: number
  distributor_lead_time?: number
  manufacturer_lead_time?: number
  demand_pattern?: string
  fixed_demand?: number
  random_demand_mean?: number
  random_demand_variance?: number
  holding_cost?: number
  backorder_cost?: number
  current_demand?: number
}

export interface GameConfig {
  initialInventory: number
  initialBacklog: number
  leadTime: {
    retailer: number
    wholesaler: number
    distributor: number
    manufacturer: number
  }
  demandPattern: "fixed" | "random" | "step"
  fixedDemand: number
  randomDemandMean: number
  randomDemandVariance: number
  holdingCost: number
  backorderCost: number
  weeks: number
  aiPlayers: PlayerRole[]
}

export interface Order {
  id?: string
  game_id: string
  from_role: PlayerRole
  to_role: PlayerRole | "customer" | "factory"
  quantity: number
  week_placed: number
  week_delivered: number
  is_delivered: boolean
  created_at?: string
}

export interface GameWeek {
  id?: string
  game_id: string
  week_number: number
  retailer_inventory: number
  retailer_backlog: number
  retailer_order: number
  retailer_shipment: number
  wholesaler_inventory: number
  wholesaler_backlog: number
  wholesaler_order: number
  wholesaler_shipment: number
  distributor_inventory: number
  distributor_backlog: number
  distributor_order: number
  distributor_shipment: number
  manufacturer_inventory: number
  manufacturer_backlog: number
  manufacturer_order: number
  manufacturer_shipment: number
  customer_demand: number
  created_at?: string
}
