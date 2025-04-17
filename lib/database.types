export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          game_code: string
          status: string
          current_week: number
          total_weeks: number
          created_at: string
          updated_at: string
          initial_inventory: number
          initial_backlog: number
          retailer_lead_time: number
          wholesaler_lead_time: number
          distributor_lead_time: number
          manufacturer_lead_time: number
          demand_pattern: string
          fixed_demand: number
          random_demand_mean: number
          random_demand_variance: number
          holding_cost: number
          backorder_cost: number
          current_demand: number
          total_team_cost: number
        }
        Insert: {
          id?: string
          game_code: string
          status?: string
          current_week?: number
          total_weeks?: number
          created_at?: string
          updated_at?: string
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
          total_team_cost?: number
        }
        Update: {
          id?: string
          game_code?: string
          status?: string
          current_week?: number
          total_weeks?: number
          created_at?: string
          updated_at?: string
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
          total_team_cost?: number
        }
      }
      players: {
        Row: {
          id: string
          game_id: string
          role: string
          name: string
          is_ai: boolean
          inventory: number
          backlog: number
          pipeline_inventory: number
          incoming_order: number
          outgoing_order: number
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          game_id: string
          role: string
          name: string
          is_ai?: boolean
          inventory?: number
          backlog?: number
          pipeline_inventory?: number
          incoming_order?: number
          outgoing_order?: number
          incoming_shipment?: number
          outgoing_shipment?: number
          next_week_incoming_shipment?: number
          weekly_holding_cost?: number
          weekly_backorder_cost?: number
          total_holding_cost?: number
          total_backorder_cost?: number
          total_cost?: number
          total_orders?: number
          total_backorders?: number
          total_inventory?: number
          total_outgoing_orders?: number
          total_outgoing_shipments?: number
          order_variability?: number
          min_order?: number
          max_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          role?: string
          name?: string
          is_ai?: boolean
          inventory?: number
          backlog?: number
          pipeline_inventory?: number
          incoming_order?: number
          outgoing_order?: number
          incoming_shipment?: number
          outgoing_shipment?: number
          next_week_incoming_shipment?: number
          weekly_holding_cost?: number
          weekly_backorder_cost?: number
          total_holding_cost?: number
          total_backorder_cost?: number
          total_cost?: number
          total_orders?: number
          total_backorders?: number
          total_inventory?: number
          total_outgoing_orders?: number
          total_outgoing_shipments?: number
          order_variability?: number
          min_order?: number
          max_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          game_id: string
          from_role: string
          to_role: string
          quantity: number
          week_placed: number
          week_delivered: number
          is_delivered: boolean
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          from_role: string
          to_role: string
          quantity: number
          week_placed: number
          week_delivered: number
          is_delivered?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          from_role?: string
          to_role?: string
          quantity?: number
          week_placed?: number
          week_delivered?: number
          is_delivered?: boolean
          created_at?: string
        }
      }
      game_weeks: {
        Row: {
          id: string
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
          created_at: string
        }
        Insert: {
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
        Update: {
          id?: string
          game_id?: string
          week_number?: number
          retailer_inventory?: number
          retailer_backlog?: number
          retailer_order?: number
          retailer_shipment?: number
          wholesaler_inventory?: number
          wholesaler_backlog?: number
          wholesaler_order?: number
          wholesaler_shipment?: number
          distributor_inventory?: number
          distributor_backlog?: number
          distributor_order?: number
          distributor_shipment?: number
          manufacturer_inventory?: number
          manufacturer_backlog?: number
          manufacturer_order?: number
          manufacturer_shipment?: number
          customer_demand?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
