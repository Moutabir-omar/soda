import { NextRequest, NextResponse } from "next/server"
import { debugGame, resetPlayerOrder } from "@/lib/game-service"
import { PlayerRole } from "@/lib/types"

export async function GET(request: NextRequest) {
  const gameId = request.nextUrl.searchParams.get("gameId")
  
  if (!gameId) {
    return NextResponse.json({ error: "Missing gameId parameter" }, { status: 400 })
  }
  
  try {
    const result = await debugGame(gameId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in debug endpoint:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId, role, action } = body
    
    if (!gameId) {
      return NextResponse.json({ error: "Missing gameId parameter" }, { status: 400 })
    }
    
    if (action === "resetOrder" && role) {
      const result = await resetPlayerOrder(gameId, role as PlayerRole)
      return NextResponse.json({ success: result })
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in debug endpoint:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
} 