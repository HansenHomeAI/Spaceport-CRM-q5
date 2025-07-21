"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { CognitoAuth, type AuthUser } from "./cognito-auth"
import { validateConfig } from "./aws-config"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; message: string }>
  confirmSignUp: (email: string, code: string) => Promise<{ success: boolean; message: string }>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if AWS config is valid
    if (!validateConfig()) {
      console.warn("AWS configuration incomplete, using demo mode")
      // Set demo user for development
      setUser({
        id: "demo-user",
        email: "demo@spaceport.com",
        name: "Demo User",
        accessToken: "demo-token",
      })
      setLoading(false)
      return
    }

    // Check for existing session
    CognitoAuth.getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser)
      })
      .catch((error) => {
        console.error("Error getting current user:", error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!validateConfig()) {
      // Demo mode
      const demoUser: AuthUser = {
        id: "demo-user",
        email,
        name: email.split("@")[0],
        accessToken: "demo-token",
      }
      setUser(demoUser)
      return { success: true, message: "Signed in successfully (demo mode)!" }
    }

    const result = await CognitoAuth.signIn(email, password)
    if (result.success && result.user) {
      setUser(result.user)
    }
    return { success: result.success, message: result.message }
  }

  const signUp = async (email: string, password: string, name: string) => {
    if (!validateConfig()) {
      return { success: false, message: "AWS configuration incomplete" }
    }

    return await CognitoAuth.signUp(email, password, name)
  }

  const confirmSignUp = async (email: string, code: string) => {
    if (!validateConfig()) {
      return { success: false, message: "AWS configuration incomplete" }
    }

    return await CognitoAuth.confirmSignUp(email, code)
  }

  const signOut = () => {
    if (validateConfig()) {
      CognitoAuth.signOut()
    }
    setUser(null)
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
