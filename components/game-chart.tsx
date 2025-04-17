"use client"

import { useEffect, useRef } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js"
import type { GameState, PlayerRole } from "@/lib/types"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface GameChartProps {
  gameState: GameState
  role: PlayerRole
}

export function GameChart({ gameState, role }: GameChartProps) {
  const chartRef = useRef<ChartJS<"line">>(null)
  const playerState = gameState[role]

  // Initialize empty arrays if history properties are undefined
  const inventoryHistory = playerState.inventory_history?.length 
    ? playerState.inventory_history 
    : Array(gameState.current_week).fill(playerState.inventory)
  
  const backlogHistory = playerState.backlog_history?.length 
    ? playerState.backlog_history 
    : Array(gameState.current_week).fill(playerState.backlog)
  
  const orderHistory = playerState.order_history?.length 
    ? playerState.order_history 
    : Array(gameState.current_week).fill(playerState.outgoing_order ?? gameState.fixed_demand)
  
  const shipmentHistory = playerState.incoming_shipment_history?.length 
    ? playerState.incoming_shipment_history 
    : Array(gameState.current_week).fill(playerState.incoming_shipment)

  // Create week labels based on current week
  const weekLabels = Array.from({ length: Math.max(gameState.current_week, 1) }, (_, i) => `Week ${i + 1}`)

  // Add projections for future weeks
  const projectionLength = 4
  const projectedWeeks = gameState.current_week + projectionLength <= gameState.total_weeks 
    ? Array.from({ length: projectionLength }, (_, i) => `Week ${gameState.current_week + i + 1}`) 
    : []
  
  const allLabels = [...weekLabels, ...projectedWeeks]

  // Get the current order trend
  const orderTrend = calculateOrderTrend(orderHistory);
  
  // Get the demand/backlog trend
  const backlogTrend = calculateTrend(backlogHistory);
  
  // Create more sophisticated projections based on current trends and game state
  const projectedInventory = calculateProjectedInventory(
    playerState.inventory, 
    orderHistory,
    shipmentHistory,
    playerState.incoming_order,
    projectionLength
  );
  
  const projectedBacklog = calculateProjectedBacklog(
    playerState.backlog,
    backlogTrend,
    projectionLength
  );
  
  // Project future orders based on the bullwhip effect (amplification of order variability)
  const projectedOrders = calculateProjectedOrders(
    orderHistory,
    playerState.incoming_order,
    orderTrend,
    projectionLength
  );

  const data = {
    labels: allLabels,
    datasets: [
      {
        label: "Inventory",
        data: [...inventoryHistory, ...projectedInventory],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        tension: 0.4,
        segment: {
          borderDash: (ctx: any) => (ctx.p1.parsed.x >= weekLabels.length - 1) ? [6, 6] : undefined,
        },
      },
      {
        label: "Backorders",
        data: [...backlogHistory, ...projectedBacklog],
        borderColor: "rgb(249, 115, 22)",
        backgroundColor: "rgba(249, 115, 22, 0.5)",
        tension: 0.4,
        segment: {
          borderDash: (ctx: any) => (ctx.p1.parsed.x >= weekLabels.length - 1) ? [6, 6] : undefined,
        },
      },
      {
        label: "Orders",
        data: [...orderHistory, ...projectedOrders],
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.5)",
        tension: 0.4,
        segment: {
          borderDash: (ctx: any) => (ctx.p1.parsed.x >= weekLabels.length - 1) ? [6, 6] : undefined,
        },
      },
      {
        label: "Incoming Shipments",
        data: shipmentHistory,
        borderColor: "rgb(139, 92, 246)",
        backgroundColor: "rgba(139, 92, 246, 0.5)",
        tension: 0.4,
      },
    ],
  }

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#6B7280",
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#111827",
        bodyColor: "#374151",
        borderColor: "#E5E7EB",
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          title: (tooltipItems) => {
            const weekIndex = tooltipItems[0].dataIndex;
            if (weekIndex >= weekLabels.length) {
              return `${tooltipItems[0].label} (Projected)`;
            }
            return tooltipItems[0].label;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(229, 231, 235, 0.2)",
        },
        ticks: {
          color: "#6B7280",
        },
      },
      y: {
        grid: {
          color: "rgba(229, 231, 235, 0.2)",
        },
        ticks: {
          color: "#6B7280",
        },
        min: 0, // Start y-axis from 0
      },
    },
  }

  // Helper functions for more realistic projections
  function calculateTrend(history: number[]): number {
    if (history.length < 2) return 0;
    
    // Look at the last few weeks to calculate trend
    const recentHistory = history.slice(-3);
    let sum = 0;
    let count = 0;
    
    for (let i = 1; i < recentHistory.length; i++) {
      sum += recentHistory[i] - recentHistory[i-1];
      count++;
    }
    
    return count > 0 ? sum / count : 0;
  }
  
  function calculateOrderTrend(history: number[]): number {
    return calculateTrend(history.map(h => h === null ? 0 : h));
  }
  
  function calculateProjectedInventory(
    currentInventory: number,
    orderHistory: (number | null)[],
    shipmentHistory: number[],
    currentDemand: number,
    projectionLength: number
  ): number[] {
    const result = [];
    let inventory = currentInventory;
    
    // Calculate average supply rate
    const avgSupply = shipmentHistory.length > 0 
      ? shipmentHistory.reduce((sum, val) => sum + val, 0) / shipmentHistory.length
      : currentDemand;
    
    // Use recent orders to estimate upcoming supply
    const recentOrders = orderHistory.slice(-3).map(o => o === null ? currentDemand : o);
    const avgRecentOrder = recentOrders.length > 0
      ? recentOrders.reduce((sum, val) => sum + val, 0) / recentOrders.length
      : currentDemand;
    
    for (let i = 0; i < projectionLength; i++) {
      // Simulate incoming shipments (with lead time)
      const incoming = i === 0 ? avgSupply : avgRecentOrder * 0.8;
      
      // Simulate outgoing shipments (demand)
      const outgoing = currentDemand * (1 + i * 0.1); // Slight demand increase
      
      // Update inventory
      inventory = Math.max(0, inventory + incoming - outgoing);
      result.push(Math.round(inventory));
    }
    
    return result;
  }
  
  function calculateProjectedBacklog(
    currentBacklog: number,
    backlogTrend: number,
    projectionLength: number
  ): number[] {
    const result = [];
    let backlog = currentBacklog;
    
    for (let i = 0; i < projectionLength; i++) {
      // Apply trend with dampening to prevent unrealistic growth
      backlog = Math.max(0, backlog + backlogTrend * Math.pow(0.8, i));
      result.push(Math.round(backlog));
    }
    
    return result;
  }
  
  function calculateProjectedOrders(
    orderHistory: (number | null)[],
    currentDemand: number,
    orderTrend: number,
    projectionLength: number
  ): number[] {
    const result = [];
    
    // Get the last order or use current demand if null
    const lastOrder: number = orderHistory.length > 0 
      ? (orderHistory[orderHistory.length - 1] ?? currentDemand)
      : currentDemand;
    
    let projectedOrder: number = lastOrder;
    
    for (let i = 0; i < projectionLength; i++) {
      // Apply trend with amplification (bullwhip effect)
      projectedOrder += orderTrend * (1 + i * 0.2);
      
      // Add volatility based on current demand
      const volatility = 0.1 * currentDemand * Math.random();
      projectedOrder += volatility * (Math.random() > 0.5 ? 1 : -1);
      
      // Prevent negative orders
      projectedOrder = Math.max(0, projectedOrder);
      
      result.push(Math.round(projectedOrder));
    }
    
    return result;
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg space-y-4">
      <div>
        <h3 className="text-lg font-medium text-sara-gold">Game Metrics</h3>
        <p className="text-sm text-gray-600">
          Current performance metrics with future projections
        </p>
      </div>
      <div className="w-full h-[300px]">
        <Line ref={chartRef} data={data} options={options} />
      </div>
      <div className="text-xs text-gray-500 italic">
        Note: Dashed lines represent projected values based on current trends
      </div>
    </div>
  )
} 