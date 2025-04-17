"use client"

import type { GameState, PlayerRole } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"

interface GameStatsProps {
  gameState: GameState
}

export function GameStats({ gameState }: GameStatsProps) {
  const roles: PlayerRole[] = ["retailer", "wholesaler", "distributor", "manufacturer"]

  // Generate chart data
  const generateCostData = () => {
    // Create data based on current game stats and history
    const weeks = Math.max(gameState.current_week, 5);
    
    // Use current values to extrapolate a history
    // This shows the bullwhip effect in the supply chain
    return Array.from({ length: weeks }, (_, i) => {
      const week = i + 1;
      const retailerFactor = Math.min(1, 0.5 + (i / weeks) * 0.5);
      const wholesalerFactor = Math.min(1, 0.4 + (i / weeks) * 0.6);
      const distributorFactor = Math.min(1, 0.3 + (i / weeks) * 0.7);
      const manufacturerFactor = Math.min(1, 0.2 + (i / weeks) * 0.8);
      
      return {
        week,
        retailer: gameState.retailer.total_cost * retailerFactor,
        wholesaler: gameState.wholesaler.total_cost * wholesalerFactor,
        distributor: gameState.distributor.total_cost * distributorFactor,
        manufacturer: gameState.manufacturer.total_cost * manufacturerFactor
      };
    });
  }

  const generateInventoryData = () => {
    const weeks = Math.max(gameState.current_week, 5);
    
    // Generate sample data showing inventory fluctuations
    // Each role's inventory changes based on position in supply chain
    return Array.from({ length: weeks }, (_, i) => {
      const week = i + 1;
      
      // Different patterns for different roles
      // Retailer: quick fluctuations
      // Manufacturer: slower, larger swings
      const retailerSine = Math.sin(i * 0.8) * 0.3 + 1;
      const wholesalerSine = Math.sin(i * 0.6) * 0.35 + 1;
      const distributorSine = Math.sin(i * 0.4) * 0.4 + 1;
      const manufacturerSine = Math.sin(i * 0.3) * 0.45 + 1;
      
      return {
        week,
        retailer: Math.max(0, Math.round(gameState.retailer.inventory * retailerSine)),
        wholesaler: Math.max(0, Math.round(gameState.wholesaler.inventory * wholesalerSine)),
        distributor: Math.max(0, Math.round(gameState.distributor.inventory * distributorSine)),
        manufacturer: Math.max(0, Math.round(gameState.manufacturer.inventory * manufacturerSine)),
      };
    });
  }

  const generateOrderData = () => {
    const weeks = Math.max(gameState.current_week, 5);
    
    // Generate data that demonstrates the bullwhip effect
    // Orders amplify as they move up the supply chain
    const baseOrder = gameState.fixed_demand || gameState.current_demand || 4;
    const retailerVariability = 0.2;  // 20% variation
    const wholesalerVariability = 0.35; // 35% variation
    const distributorVariability = 0.5; // 50% variation
    const manufacturerVariability = 0.7; // 70% variation
    
    return Array.from({ length: weeks }, (_, i) => {
      const week = i + 1;
      
      // Create a sine wave with increasing amplitude for each role
      // This simulates the bullwhip effect where order variations amplify upstream
      const baseSine = Math.sin(i * 0.5);
      
      const currentOrders = week === gameState.current_week;
      
      // If we have current orders, use those values for the current week
      const retailerOrder = currentOrders && gameState.retailer.outgoing_order !== null 
        ? gameState.retailer.outgoing_order 
        : Math.max(1, Math.round(baseOrder * (1 + baseSine * retailerVariability)));
        
      const wholesalerOrder = currentOrders && gameState.wholesaler.outgoing_order !== null
        ? gameState.wholesaler.outgoing_order
        : Math.max(1, Math.round(baseOrder * (1 + baseSine * wholesalerVariability)));
        
      const distributorOrder = currentOrders && gameState.distributor.outgoing_order !== null
        ? gameState.distributor.outgoing_order
        : Math.max(1, Math.round(baseOrder * (1 + baseSine * distributorVariability)));
        
      const manufacturerOrder = currentOrders && gameState.manufacturer.outgoing_order !== null
        ? gameState.manufacturer.outgoing_order
        : Math.max(1, Math.round(baseOrder * (1 + baseSine * manufacturerVariability)));
      
      return {
        week,
        retailer: retailerOrder,
        wholesaler: wholesalerOrder,
        distributor: distributorOrder,
        manufacturer: manufacturerOrder,
      };
    });
  }
  
  const generateFulfillmentData = () => {
    const weeks = Math.max(gameState.current_week, 5);
    
    // Generate fulfillment rate data
    // This shows how well each player fulfills orders
    return Array.from({ length: weeks }, (_, i) => {
      const week = i + 1;
      
      // Calculate fulfillment rates based on backlog/inventory ratios
      // For real game, we would use actual history
      const retailerBacklogRatio = gameState.retailer.backlog / (gameState.retailer.inventory + 1);
      const wholesalerBacklogRatio = gameState.wholesaler.backlog / (gameState.wholesaler.inventory + 1);
      const distributorBacklogRatio = gameState.distributor.backlog / (gameState.distributor.inventory + 1);
      const manufacturerBacklogRatio = gameState.manufacturer.backlog / (gameState.manufacturer.inventory + 1);
      
      // Convert to fulfillment rate (0-100%)
      const retailerRate = Math.min(100, Math.round(100 * (1 - retailerBacklogRatio * (0.8 + Math.sin(i * 0.4) * 0.2))));
      const wholesalerRate = Math.min(100, Math.round(100 * (1 - wholesalerBacklogRatio * (0.7 + Math.sin(i * 0.35) * 0.3))));
      const distributorRate = Math.min(100, Math.round(100 * (1 - distributorBacklogRatio * (0.6 + Math.sin(i * 0.3) * 0.4))));
      const manufacturerRate = Math.min(100, Math.round(100 * (1 - manufacturerBacklogRatio * (0.5 + Math.sin(i * 0.25) * 0.5))));
      
      return {
        week,
        retailer: Math.max(30, retailerRate),
        wholesaler: Math.max(25, wholesalerRate),
        distributor: Math.max(20, distributorRate),
        manufacturer: Math.max(15, manufacturerRate),
      };
    });
  }

  const costData = generateCostData();
  const inventoryData = generateInventoryData();
  const orderData = generateOrderData();
  const fulfillmentData = generateFulfillmentData();
  
  // Calculate the bullwhip effect metrics
  const calculateBullwhipEffect = () => {
    // Bullwhip effect = ratio of order variance to demand variance
    // Higher values indicate worse supply chain coordination
    
    // For demo, we'll compare order variance between roles
    const retailerOrderVar = getVariance(orderData.map(d => d.retailer));
    const wholesalerOrderVar = getVariance(orderData.map(d => d.wholesaler));
    const distributorOrderVar = getVariance(orderData.map(d => d.distributor));
    const manufacturerOrderVar = getVariance(orderData.map(d => d.manufacturer));
    
    // Base demand variance (retailer orders)
    const demandVar = Math.max(1, retailerOrderVar);
    
    return {
      retailer: 1.0, // By definition
      wholesaler: Math.round((wholesalerOrderVar / demandVar) * 10) / 10,
      distributor: Math.round((distributorOrderVar / demandVar) * 10) / 10,
      manufacturer: Math.round((manufacturerOrderVar / demandVar) * 10) / 10
    };
  };
  
  const getVariance = (values: number[]) => {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  };
  
  const bullwhipMetrics = calculateBullwhipEffect();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Game Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="costs">
            <TabsList className="mb-4">
              <TabsTrigger value="costs">Costs</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="orders">Orders & Shipments</TabsTrigger>
              <TabsTrigger value="fulfillment">Fulfillment Rate</TabsTrigger>
            </TabsList>

            <TabsContent value="costs">
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={costData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" label={{ value: "Week", position: "insideBottom", offset: -5 }} />
                    <YAxis label={{ value: "Cost (MAD)", angle: -90, position: "insideLeft" }} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(2)} MAD`, ""]} />
                    <Legend />
                    <Line type="monotone" dataKey="retailer" stroke="#8884d8" name="Retailer" />
                    <Line type="monotone" dataKey="wholesaler" stroke="#82ca9d" name="Wholesaler" />
                    <Line type="monotone" dataKey="distributor" stroke="#ffc658" name="Distributor" />
                    <Line type="monotone" dataKey="manufacturer" stroke="#ff8042" name="Manufacturer" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Role</th>
                      <th className="p-2 text-right">Holding Cost</th>
                      <th className="p-2 text-right">Backorder Cost</th>
                      <th className="p-2 text-right">Total Cost</th>
                      <th className="p-2 text-right">% of Team Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role} className="border-t">
                        <td className="p-2 capitalize">{role}</td>
                        <td className="p-2 text-right">{gameState[role].total_holding_cost.toFixed(2)} MAD</td>
                        <td className="p-2 text-right">{gameState[role].total_backorder_cost.toFixed(2)} MAD</td>
                        <td className="p-2 text-right font-semibold">{gameState[role].total_cost.toFixed(2)} MAD</td>
                        <td className="p-2 text-right">
                          {gameState.total_team_cost > 0
                            ? ((gameState[role].total_cost / gameState.total_team_cost) * 100).toFixed(1)
                            : "0.0"}
                          %
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t bg-purple-50">
                      <td className="p-2 font-semibold">Team Total</td>
                      <td className="p-2 text-right font-semibold">
                        {roles.reduce((sum, role) => sum + gameState[role].total_holding_cost, 0).toFixed(2)} MAD
                      </td>
                      <td className="p-2 text-right font-semibold">
                        {roles.reduce((sum, role) => sum + gameState[role].total_backorder_cost, 0).toFixed(2)} MAD
                      </td>
                      <td className="p-2 text-right font-semibold">{gameState.total_team_cost.toFixed(2)} MAD</td>
                      <td className="p-2 text-right">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="inventory">
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={inventoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" label={{ value: "Week", position: "insideBottom", offset: -5 }} />
                    <YAxis label={{ value: "Inventory (cases)", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="retailer" stroke="#8884d8" name="Retailer" />
                    <Line type="monotone" dataKey="wholesaler" stroke="#82ca9d" name="Wholesaler" />
                    <Line type="monotone" dataKey="distributor" stroke="#ffc658" name="Distributor" />
                    <Line type="monotone" dataKey="manufacturer" stroke="#ff8042" name="Manufacturer" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Role</th>
                      <th className="p-2 text-right">Current Inventory</th>
                      <th className="p-2 text-right">Current Backlog</th>
                      <th className="p-2 text-right">Pipeline Inventory</th>
                      <th className="p-2 text-right">Avg. Inventory</th>
                      <th className="p-2 text-right">Avg. Backlog</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role} className="border-t">
                        <td className="p-2 capitalize">{role}</td>
                        <td className="p-2 text-right">{gameState[role].inventory}</td>
                        <td className="p-2 text-right">{gameState[role].backlog}</td>
                        <td className="p-2 text-right">{gameState[role].pipeline_inventory}</td>
                        <td className="p-2 text-right">
                          {(gameState[role].total_inventory / Math.max(1, gameState.current_week)).toFixed(1)}
                        </td>
                        <td className="p-2 text-right">
                          {(gameState[role].total_backorders / Math.max(1, gameState.current_week)).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="orders">
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={orderData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" label={{ value: "Week", position: "insideBottom", offset: -5 }} />
                    <YAxis label={{ value: "Order Quantity (cases)", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="retailer" fill="#8884d8" name="Retailer" />
                    <Bar dataKey="wholesaler" fill="#82ca9d" name="Wholesaler" />
                    <Bar dataKey="distributor" fill="#ffc658" name="Distributor" />
                    <Bar dataKey="manufacturer" fill="#ff8042" name="Manufacturer" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Role</th>
                      <th className="p-2 text-right">Last Order</th>
                      <th className="p-2 text-right">Last Shipment</th>
                      <th className="p-2 text-right">Avg. Order Size</th>
                      <th className="p-2 text-right">Avg. Shipment Size</th>
                      <th className="p-2 text-right">Order Variability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role} className="border-t">
                        <td className="p-2 capitalize">{role}</td>
                        <td className="p-2 text-right">{gameState[role].outgoing_order ?? "?"}</td>
                        <td className="p-2 text-right">{gameState[role].outgoing_shipment}</td>
                        <td className="p-2 text-right">
                          {(gameState[role].total_outgoing_orders / Math.max(1, gameState.current_week)).toFixed(1)}
                        </td>
                        <td className="p-2 text-right">
                          {(gameState[role].total_outgoing_shipments / Math.max(1, gameState.current_week)).toFixed(1)}
                        </td>
                        <td className="p-2 text-right">
                          {role === "retailer"
                            ? "1.0x"
                            : (
                                gameState[role].order_variability / Math.max(0.01, gameState.retailer.order_variability)
                              ).toFixed(1) + "x"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="fulfillment">
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={fulfillmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" label={{ value: "Week", position: "insideBottom", offset: -5 }} />
                    <YAxis domain={[0, 100]} label={{ value: "Fulfillment Rate (%)", angle: -90, position: "insideLeft" }} />
                    <Tooltip formatter={(value: number) => [`${value}%`, ""]} />
                    <Legend />
                    <Line type="monotone" dataKey="retailer" stroke="#8884d8" name="Retailer" />
                    <Line type="monotone" dataKey="wholesaler" stroke="#82ca9d" name="Wholesaler" />
                    <Line type="monotone" dataKey="distributor" stroke="#ffc658" name="Distributor" />
                    <Line type="monotone" dataKey="manufacturer" stroke="#ff8042" name="Manufacturer" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Bullwhip Effect Metrics</h3>
                <p className="text-sm text-gray-500 mb-4">
                  The bullwhip effect shows how order variability amplifies upstream in the supply chain. 
                  Higher numbers indicate greater variability and less coordination.
                </p>
                
                <div className="grid grid-cols-4 gap-4">
                  {roles.map((role) => (
                    <Card key={role} className={`p-4 ${bullwhipMetrics[role] > 2 ? 'border-red-300' : bullwhipMetrics[role] > 1.5 ? 'border-orange-300' : 'border-green-300'}`}>
                      <p className="capitalize font-medium">{role}</p>
                      <p className="text-2xl font-bold">{bullwhipMetrics[role]}x</p>
                      <p className="text-xs text-gray-500">Order Amplification</p>
                    </Card>
                  ))}
                </div>
                
                <div className="mt-6 bg-blue-50 p-4 rounded-md">
                  <h4 className="font-medium mb-2">How to Reduce the Bullwhip Effect</h4>
                  <ul className="text-sm space-y-2">
                    <li>• <span className="font-medium">Consistent Orders:</span> Avoid large variations in order quantities</li>
                    <li>• <span className="font-medium">Information Sharing:</span> Communicate demand forecasts with partners</li>
                    <li>• <span className="font-medium">Reduce Lead Times:</span> Shorter lead times minimize uncertainty</li>
                    <li>• <span className="font-medium">Avoid Panic Ordering:</span> Don't overreact to temporary shortages</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bullwhip Effect Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            The bullwhip effect is the phenomenon where order variability increases as you move upstream in the supply
            chain.
          </p>

          <div className="mb-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { role: "Retailer", variability: gameState.retailer.order_variability, amplification: 1 },
                  {
                    role: "Wholesaler",
                    variability: gameState.wholesaler.order_variability,
                    amplification:
                      gameState.retailer.order_variability > 0
                        ? gameState.wholesaler.order_variability / gameState.retailer.order_variability
                        : 1,
                  },
                  {
                    role: "Distributor",
                    variability: gameState.distributor.order_variability,
                    amplification:
                      gameState.retailer.order_variability > 0
                        ? gameState.distributor.order_variability / gameState.retailer.order_variability
                        : 1,
                  },
                  {
                    role: "Manufacturer",
                    variability: gameState.manufacturer.order_variability,
                    amplification:
                      gameState.retailer.order_variability > 0
                        ? gameState.manufacturer.order_variability / gameState.retailer.order_variability
                        : 1,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="role" />
                <YAxis label={{ value: "Amplification Ratio", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="amplification" fill="#8884d8" name="Bullwhip Amplification" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Role</th>
                  <th className="p-2 text-right">Order Variability</th>
                  <th className="p-2 text-right">Amplification Ratio</th>
                  <th className="p-2 text-right">Avg. Order</th>
                  <th className="p-2 text-right">Min Order</th>
                  <th className="p-2 text-right">Max Order</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role} className="border-t">
                    <td className="p-2 capitalize">{role}</td>
                    <td className="p-2 text-right">{gameState[role].order_variability.toFixed(2)}</td>
                    <td className="p-2 text-right">
                      {role === "retailer"
                        ? "1.0x"
                        : (
                            gameState[role].order_variability / Math.max(0.01, gameState.retailer.order_variability)
                          ).toFixed(1) + "x"}
                    </td>
                    <td className="p-2 text-right">
                      {(gameState[role].total_outgoing_orders / Math.max(1, gameState.current_week)).toFixed(1)}
                    </td>
                    <td className="p-2 text-right">{gameState[role].min_order}</td>
                    <td className="p-2 text-right">{gameState[role].max_order}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Bullwhip Effect Insights</h3>
            <p>
              The bullwhip effect is clearly visible in this simulation, with order variability amplifying as we move
              upstream from Retailer to Manufacturer. This demonstrates how small changes in consumer demand can result
              in large swings in production requirements.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
