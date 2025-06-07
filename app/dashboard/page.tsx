"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Brain, LogOut, Play, Trophy, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { UserNav } from "@/components/user-nav"

interface User {
  name: string
  username: string
  session_id: string
  english_level: number
  score: number
  challenges: any[]
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }

    setUser(JSON.parse(storedUser))
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Brain className="h-8 w-8 animate-pulse text-primary" />
      </div>
    )
  }

  if (!user) return null

  // Calculate progress to next level (cada 20 puntos)
  const pointsToNextLevel = 20
  const currentLevelProgress = user.score % pointsToNextLevel
  const pointsNeeded = pointsToNextLevel - currentLevelProgress
  const progress = (currentLevelProgress / pointsToNextLevel) * 100

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <Brain className="h-6 w-6 text-primary" />
            <span>MindQuest</span>
          </div>
          <UserNav user={user} />
        </div>
      </header>

      <main className="flex-1">
        <div className="container py-6">
          <motion.div
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  localStorage.removeItem("user")
                  router.push("/login")
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>

            <Separator className="my-2" />

            <motion.div
              className="grid gap-4 md:grid-cols-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">English Level</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{user.english_level}</div>
                  <p className="text-xs text-muted-foreground">{pointsNeeded} points to next level</p>
                  <Progress value={progress} className="mt-2 h-1" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{user.score}</div>
                  <p className="text-xs text-muted-foreground">Total score earned</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Challenges</CardTitle>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{user.challenges.length}</div>
                  <p className="text-xs text-muted-foreground">Completed challenges</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="bg-primary/5">
                  <CardTitle>Ready for a challenge?</CardTitle>
                  <CardDescription>Start a new AI challenge and earn points to level up</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <motion.div
                      className="rounded-full bg-primary/10 p-6"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Brain className="h-12 w-12 text-primary" />
                    </motion.div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">Level {user.english_level} Challenge</h3>
                      <p className="text-sm text-muted-foreground">
                        This challenge is tailored to your current English level. Complete it to earn points and
                        progress to the next level.
                      </p>
                    </div>
                    <Button size="lg" className="mt-2 gap-2" onClick={() => router.push("/play")}>
                      <Play className="h-4 w-4" /> Start Challenge
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
