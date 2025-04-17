"use client"

import { useEffect, useState, useCallback } from "react"
import type { PlayerRole } from "@/lib/types"
import { supabase } from "@/lib/supabase"
import { placeOrder, startGame as startGameService } from "@/lib/game-service"

export function useGameSocket(gameId: string, role: PlayerRole | null, playerName: string) {
  const [connected, setConnected] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [actualGameId, setActualGameId] = useState<string | null>(null)

  useEffect(() => {
    // First, we need to get the actual game ID if we're using a game code
    const getActualGameId = async () => {
      try {
        // Check if gameId is a UUID (actual ID) or a game code
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId)

        if (isUUID) {
          // It's already a UUID, use it directly
          setActualGameId(gameId)
        } else {
          // It's a game code, get the actual ID
          const { data, error } = await supabase.from("games").select("id").eq("game_code", gameId).single()

          if (error) {
            console.error("Error getting game ID from code:", error)
            return
          }

          setActualGameId(data.id)
        }
      } catch (error) {
        console.error("Error in getActualGameId:", error)
      }
    }

    getActualGameId()
  }, [gameId])

  useEffect(() => {
    // Set up Supabase realtime subscription once we have the actual game ID
    if (actualGameId) {
      console.log("Setting up realtime subscription for game ID:", actualGameId)

      const gameSubscription = supabase
        .channel(`game:${actualGameId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "games",
            filter: `id=eq.${actualGameId}`,
          },
          (payload) => {
            console.log("Game updated:", payload)
            // Trigger any callbacks or state updates here
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "players",
            filter: `game_id=eq.${actualGameId}`,
          },
          (payload: { 
            new: { outgoing_order?: number | null; role?: string; } | null; 
            old: { outgoing_order?: number | null; } | null; 
          }) => {
            console.log("Player updated:", payload)
            // Check if this is an order update
            if (
              payload.new && 
              payload.old &&
              'outgoing_order' in payload.new && 
              'outgoing_order' in payload.old &&
              payload.new.outgoing_order !== payload.old.outgoing_order
            ) {
              console.log("Order placed by player:", payload.new.role, "quantity:", payload.new.outgoing_order)
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `game_id=eq.${actualGameId}`,
          },
          (payload) => {
            console.log("Order updated:", payload)
          },
        )
        .subscribe((status) => {
          console.log("Supabase realtime subscription status:", status)
          setConnected(status === 'SUBSCRIBED')
        })

      setSubscription(gameSubscription)
      setConnected(true)

      return () => {
        console.log("Cleaning up subscription for game ID:", actualGameId)
        gameSubscription.unsubscribe()
      }
    }
  }, [actualGameId])

  const sendOrder = useCallback(
    async (quantity: number) => {
      if (!actualGameId || !role) return

      try {
        await placeOrder(actualGameId, role, quantity)
        console.log(`Order of ${quantity} cases placed by ${role}`)
      } catch (error) {
        console.error("Error placing order:", error)
      }
    },
    [actualGameId, role],
  )

  const startGame = useCallback(async () => {
    if (!actualGameId) return

    try {
      await startGameService(actualGameId)
      console.log(`Game ${actualGameId} started`)
    } catch (error) {
      console.error("Error starting game:", error)
    }
  }, [actualGameId])

  return {
    connected,
    sendOrder,
    startGame,
  }
}
