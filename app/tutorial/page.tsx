import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Package, AlertTriangle, TrendingUp, DollarSign } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function TutorialPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-purple-900 mb-4">How to Play the Soda Distribution Game</h1>
            <p className="text-lg text-gray-600">
              Learn the rules, strategies, and concepts behind the Soda Distribution Game
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Game Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                The Soda Distribution Game is a simulation of a supply chain with four roles: Retailer, Wholesaler,
                Distributor, and Manufacturer. Each player manages one role in the supply chain.
              </p>

              <p>
                The goal is to minimize costs while meeting customer demand. Costs come from holding inventory (storage
                costs) and backorders (unfulfilled orders).
              </p>

              <div className="flex items-center justify-center my-6">
                <div className="flex flex-col items-center mx-4">
                  <Package className="h-8 w-8 text-blue-500 mb-2" />
                  <span className="font-semibold">Manufacturer</span>
                </div>
                <ArrowRight className="h-6 w-6 text-gray-400" />
                <div className="flex flex-col items-center mx-4">
                  <Package className="h-8 w-8 text-blue-500 mb-2" />
                  <span className="font-semibold">Distributor</span>
                </div>
                <ArrowRight className="h-6 w-6 text-gray-400" />
                <div className="flex flex-col items-center mx-4">
                  <Package className="h-8 w-8 text-blue-500 mb-2" />
                  <span className="font-semibold">Wholesaler</span>
                </div>
                <ArrowRight className="h-6 w-6 text-gray-400" />
                <div className="flex flex-col items-center mx-4">
                  <Package className="h-8 w-8 text-blue-500 mb-2" />
                  <span className="font-semibold">Retailer</span>
                </div>
                <ArrowRight className="h-6 w-6 text-gray-400" />
                <div className="flex flex-col items-center mx-4">
                  <DollarSign className="h-8 w-8 text-green-500 mb-2" />
                  <span className="font-semibold">Customer</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Game Mechanics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-semibold">Weekly Cycle</h3>
              <p>Each week, the following events occur in order:</p>

              <ol className="list-decimal pl-6 space-y-2">
                <li>
                  <span className="font-semibold">Receive Shipments:</span> Each player receives shipments from their
                  upstream supplier.
                </li>
                <li>
                  <span className="font-semibold">Receive Orders:</span> Each player receives orders from their
                  downstream customer.
                </li>
                <li>
                  <span className="font-semibold">Ship Products:</span> Each player ships as much as possible to fulfill
                  orders (including backorders).
                </li>
                <li>
                  <span className="font-semibold">Place Orders:</span> Each player decides how much to order from their
                  supplier.
                </li>
                <li>
                  <span className="font-semibold">Calculate Costs:</span> Holding costs and backorder costs are
                  calculated.
                </li>
              </ol>

              <h3 className="text-lg font-semibold mt-6">Lead Times</h3>
              <p>
                There is a delay between when an order is placed and when it is received. This is called the lead time.
                Each role has its own lead time, typically 1-3 weeks.
              </p>

              <h3 className="text-lg font-semibold mt-6">Costs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Package className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="font-semibold">Holding Cost</span>
                  </div>
                  <p>Cost per case of inventory held at the end of each week.</p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                    <span className="font-semibold">Backorder Cost</span>
                  </div>
                  <p>Cost per case of unfulfilled orders at the end of each week.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Concepts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center">
                  <TrendingUp className="h-5 w-5 text-purple-500 mr-2" />
                  The Bullwhip Effect
                </h3>
                <p className="mt-2">
                  The Bullwhip Effect is a phenomenon where small changes in consumer demand cause increasingly larger
                  fluctuations in orders as you move upstream in the supply chain. This leads to:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Excess inventory</li>
                  <li>Poor customer service</li>
                  <li>Lost revenues</li>
                  <li>Inefficient production</li>
                  <li>Increased transportation costs</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Causes of the Bullwhip Effect</h3>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>
                    <span className="font-semibold">Demand Forecast Updating:</span> Overreacting to short-term changes
                    in demand
                  </li>
                  <li>
                    <span className="font-semibold">Order Batching:</span> Placing orders in large batches rather than
                    continuously
                  </li>
                  <li>
                    <span className="font-semibold">Price Fluctuations:</span> Buying in bulk when prices are low
                  </li>
                  <li>
                    <span className="font-semibold">Shortage Gaming:</span> Ordering more than needed when supply is
                    tight
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Strategies to Reduce the Bullwhip Effect</h3>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>
                    <span className="font-semibold">Information Sharing:</span> Share demand data across the supply
                    chain
                  </li>
                  <li>
                    <span className="font-semibold">Channel Alignment:</span> Coordinate pricing, transportation, and
                    inventory
                  </li>
                  <li>
                    <span className="font-semibold">Operational Efficiency:</span> Reduce lead times and batch sizes
                  </li>
                  <li>
                    <span className="font-semibold">Strategic Partnerships:</span> Build trust and collaboration with
                    suppliers and customers
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips for Success</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <span className="font-semibold">Consider the Pipeline:</span> Remember that orders take time to
                  arrive. Factor in what you've already ordered but haven't received yet.
                </li>
                <li>
                  <span className="font-semibold">Communicate:</span> If possible, communicate with your team members to
                  coordinate orders.
                </li>
                <li>
                  <span className="font-semibold">Be Consistent:</span> Try to maintain a steady ordering pattern rather
                  than making large adjustments.
                </li>
                <li>
                  <span className="font-semibold">Balance Costs:</span> Find the right balance between holding costs and
                  backorder costs.
                </li>
                <li>
                  <span className="font-semibold">Learn from History:</span> Use the statistics tab to analyze past
                  performance and adjust your strategy.
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Link href="/">
              <Button className="bg-purple-700 hover:bg-purple-800">Return to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
