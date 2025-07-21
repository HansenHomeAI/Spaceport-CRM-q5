"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface AuthUser {
  id: string
  email: string
  name: string
  accessToken: string
  isDemo?: boolean
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; message: string }>
  confirmSignUp: (email: string, code: string) => Promise<{ success: boolean; message: string }>
  signOut: () => void
  signInDemo: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Demo accounts for testing
const DEMO_ACCOUNTS = [
  {
    id: "demo-user-1",
    email: "demo@spaceport.com",
    name: "Demo User",
    accessToken: "demo-token-1",
    isDemo: true,
  },
  {
    id: "demo-user-2",
    email: "sarah@spaceport.com",
    name: "Sarah Johnson",
    accessToken: "demo-token-2",
    isDemo: true,
  },
  {
    id: "demo-user-3",
    email: "mike@spaceport.com",
    name: "Mike Davis",
    accessToken: "demo-token-3",
    isDemo: true,
  },
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session in localStorage
    const savedUser = localStorage.getItem("spaceport-user")
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
      } catch (error) {
        console.error("Error parsing saved user:", error)
        localStorage.removeItem("spaceport-user")
      }
    }
    setLoading(false)
  }, [])

  const signIn = async (email: string, password: string) => {
    // Check demo accounts first
    const demoAccount = DEMO_ACCOUNTS.find((account) => account.email === email)
    if (demoAccount && password === "demo123") {
      setUser(demoAccount)
      localStorage.setItem("spaceport-user", JSON.stringify(demoAccount))
      return { success: true, message: "Signed in successfully (demo mode)!" }
    }

    // For now, create a new user account for any other email/password combo
    // In production, this would integrate with AWS Cognito
    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      email,
      name: email.split("@")[0],
      accessToken: `token-${Date.now()}`,
      isDemo: false,
    }

    setUser(newUser)
    localStorage.setItem("spaceport-user", JSON.stringify(newUser))
    return { success: true, message: "Signed in successfully!" }
  }

  const signUp = async (email: string, password: string, name: string) => {
    // For now, immediately create the account
    // In production, this would integrate with AWS Cognito
    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      email,
      name,
      accessToken: `token-${Date.now()}`,
      isDemo: false,
    }

    setUser(newUser)
    localStorage.setItem("spaceport-user", JSON.stringify(newUser))
    return { success: true, message: "Account created successfully!" }
  }

  const confirmSignUp = async (email: string, code: string) => {
    // For now, just return success
    // In production, this would verify the code with AWS Cognito
    return { success: true, message: "Account confirmed successfully!" }
  }

  const signInDemo = () => {
    const demoUser = DEMO_ACCOUNTS[0]
    setUser(demoUser)
    localStorage.setItem("spaceport-user", JSON.stringify(demoUser))
  }

  const signOut = () => {
    setUser(null)
    localStorage.removeItem("spaceport-user")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        confirmSignUp,
        signOut,
        signInDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  // If no provider is mounted (e.g. in an isolated preview), fall back to
  // a no-op unauthenticated context to prevent hard crashes.
  if (context === undefined) {
    return {
      user: null,
      loading: false,
      signIn: async (_e: string, _p: string) => ({ success: false, message: "AuthProvider not mounted." }),
      signUp: async (_e: string, _p: string, _n: string) => ({ success: false, message: "AuthProvider not mounted." }),
      confirmSignUp: async (_e: string, _c: string) => ({ success: false, message: "AuthProvider not mounted." }),
      signOut: () => {},
      signInDemo: () => {},
    } satisfies AuthContextType
  }

  return context
}
