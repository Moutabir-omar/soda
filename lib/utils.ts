import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateGameId(): string {
  // Generate a random 6-character alphanumeric code
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export function calculateNormalRandom(mean: number, variance: number): number {
  // Box-Muller transform to generate normally distributed random numbers
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)

  // Apply mean and standard deviation
  const stdDev = Math.sqrt(variance)
  const result = Math.round(mean + z0 * stdDev)

  // Ensure result is at least 0
  return Math.max(0, result)
}

export function calculatePoissonRandom(lambda: number): number {
  // Generate a Poisson distributed random number
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1

  do {
    k++
    p *= Math.random()
  } while (p > L)

  return k - 1
}

export function calculateStepDemand(week: number, baseValue: number, stepWeek: number, stepAmount: number): number {
  // Generate a step function demand pattern
  if (week >= stepWeek) {
    return baseValue + stepAmount
  }
  return baseValue
}
