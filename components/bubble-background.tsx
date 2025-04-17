"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface Bubble {
  id: number
  size: number
  x: number
  y: number
  speed: number
  delay: number
  rotation: number
  rotationSpeed: number
}

// Predefined bubble positions to ensure consistent initial render
const initialBubbles: Bubble[] = [
  { id: 1, size: 60, x: 10, y: 120, speed: 0.2, delay: 0, rotation: 0, rotationSpeed: 0.1 },
  { id: 2, size: 40, x: 30, y: 140, speed: 0.3, delay: 5, rotation: 45, rotationSpeed: -0.1 },
  { id: 3, size: 80, x: 50, y: 160, speed: 0.25, delay: 10, rotation: 90, rotationSpeed: 0.15 },
  { id: 4, size: 50, x: 70, y: 180, speed: 0.35, delay: 15, rotation: 135, rotationSpeed: -0.15 },
  { id: 5, size: 70, x: 90, y: 200, speed: 0.15, delay: 20, rotation: 180, rotationSpeed: 0.2 },
]

export function BubbleBackground() {
  const [bubbles, setBubbles] = useState<Bubble[]>(initialBubbles)

  useEffect(() => {
    // Generate additional random bubbles after initial render
    const newBubbles: Bubble[] = [...initialBubbles]
    const bubbleCount = 25 // Additional bubbles for a fuller effect

    for (let i = initialBubbles.length; i < bubbleCount; i++) {
      newBubbles.push({
        id: i + 1,
        size: Math.random() * 100 + 20,
        x: Math.random() * 100,
        y: Math.random() * 120 + 100,
        speed: Math.random() * 0.4 + 0.1,
        delay: Math.random() * 40,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      })
    }

    setBubbles(newBubbles)

    // Animation loop
    let animationFrameId: number
    let lastTime = 0

    const animate = (time: number) => {
      if (lastTime === 0) {
        lastTime = time
      }
      const deltaTime = time - lastTime
      lastTime = time

      setBubbles((prevBubbles) =>
        prevBubbles.map((bubble) => {
          // Only animate if the delay has passed
          if (bubble.delay > 0) {
            return { ...bubble, delay: bubble.delay - deltaTime * 0.001 }
          }

          // Update position and rotation
          return {
            ...bubble,
            y: bubble.y - bubble.speed * deltaTime * 0.1,
            rotation: bubble.rotation + bubble.rotationSpeed * deltaTime * 0.1,
          }
        })
      )

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute opacity-20 mix-blend-overlay"
          style={{
            width: bubble.size,
            height: bubble.size,
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            transform: `rotate(${bubble.rotation}deg)`,
            transition: bubble.delay > 0 ? 'none' : 'transform 0.1s linear',
          }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-sara-purple/30 to-sara-gold/30" />
        </div>
      ))}
    </div>
  )
}
