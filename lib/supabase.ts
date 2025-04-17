import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Add console logs to check if environment variables are properly set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables are not properly set:", {
    url: supabaseUrl ? "Set" : "Not set",
    key: supabaseAnonKey ? "Set" : "Not set",
  })
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Test the connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error("Error connecting to Supabase:", error)
  } else {
    console.log("Successfully connected to Supabase")
  }
})
