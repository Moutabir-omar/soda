import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          <div className="relative w-64 h-64">
            <Image src="/logo.png" alt="Soda Game S.A.R.A. Logo" fill className="object-contain" />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-sara-gold sm:text-6xl">Soda Distribution Game</h1>

          <p className="max-w-2xl text-lg text-white">
            Experience the challenges of managing a supply chain in this real-time simulation. Based on the MIT Beer
            Game, but with a refreshing soda twist!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            <Card className="border-sara-coral">
              <CardHeader>
                <CardTitle className="text-sara-gold">Start New Game</CardTitle>
                <CardDescription>Configure and start a new game session</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Create a new game with custom settings for demand patterns, lead times, and costs.</p>
              </CardContent>
              <CardFooter>
                <Link href="/new-game" className="w-full">
                  <Button className="w-full bg-sara-purple hover:bg-opacity-90">Create Game</Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="border-sara-coral">
              <CardHeader>
                <CardTitle className="text-sara-gold">Join Existing Game</CardTitle>
                <CardDescription>Join a game with a session code</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Enter a game code to join an existing session as one of the four supply chain roles.</p>
              </CardContent>
              <CardFooter>
                <Link href="/join-game" className="w-full">
                  <Button className="w-full bg-sara-purple hover:bg-opacity-90">Join Game</Button>
                </Link>
              </CardFooter>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
            <Card className="border-sara-coral">
              <CardHeader>
                <CardTitle className="text-sara-gold">How to Play</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Learn the rules and strategies of the Soda Distribution Game.</p>
              </CardContent>
              <CardFooter>
                <Link href="/tutorial" className="w-full">
                  <Button variant="outline" className="w-full border-sara-gold text-sara-gold">
                    Tutorial
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="border-sara-coral">
              <CardHeader>
                <CardTitle className="text-sara-gold">Practice Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Play against AI opponents to practice your supply chain management skills.</p>
              </CardContent>
              <CardFooter>
                <Link href="/practice" className="w-full">
                  <Button variant="outline" className="w-full border-sara-gold text-sara-gold">
                    Practice
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="border-sara-coral">
              <CardHeader>
                <CardTitle className="text-sara-gold">Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p>See the best performing teams and players in the Soda Distribution Game.</p>
              </CardContent>
              <CardFooter>
                <Link href="/leaderboard" className="w-full">
                  <Button variant="outline" className="w-full border-sara-gold text-sara-gold">
                    View Scores
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      <div className="mt-8 text-center">
        <Link href="/test-connection" className="text-white hover:underline text-sm">
          Test Supabase Connection
        </Link>
      </div>
    </div>
  )
}
