"use client"

import React from "react"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { ArrowLeft, Brain, Check, Loader2, X, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface User {
  name: string
  username: string
  session_id: string
  english_level: number
  score: number
  challenges: any[]
}

interface Challenge {
  descripcion: string
  ejercicio: string
}

interface Result {
  score: number
  totalScore: number
  feedback: string
}

export default function Play() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [answer, setAnswer] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [challengeLoading, setChallengeLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }

    const userData = JSON.parse(storedUser)
    setUser(userData)
    fetchNewChallenge(userData)
    setLoading(false)
  }, [router])

  const fetchNewChallenge = async (userData: User) => {
    setChallengeLoading(true)
    setError("")

    try {
      const response = await fetch("https://dev-academy.n8n.itelisoft.org/webhook/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: userData.session_id,
          english_level: userData.english_level,
        }),
      })

      const data = await response.json()
      console.log("Questions API Response:", data)

      if (response.ok) {
        if (Array.isArray(data) && data.length > 0) {
          const challengeData = data[0]
          if (challengeData.error) {
            setError(challengeData.error)
          } else if (challengeData.descripcion && challengeData.ejercicio) {
            setChallenge({
              descripcion: challengeData.descripcion,
              ejercicio: challengeData.ejercicio,
            })
          } else {
            setError("Invalid response format from server")
          }
        } else if (data.error) {
          setError(data.error)
        } else {
          setError("No challenge data received")
        }
      } else {
        setError(data.error || "Failed to fetch challenge")
      }
    } catch (err) {
      console.error("Error fetching challenge:", err)
      setError("Network error. Please try again.")
    } finally {
      setChallengeLoading(false)
    }
  }

  const parseResultMessage = (message: string) => {
    try {
      // Extraer información del mensaje de texto
      const usernameMatch = message.match(/username([^\s]+)/)
      const levelMatch = message.match(/english_level(\d+)/)
      const scoreMatch = message.match(/score(\d+)/)
      const totalScoreMatch = message.match(/total score(\d+)/)
      const feedbackMatch = message.match(/feedback(.+?)(?=\s*https?:\/\/|$)/)

      const username = usernameMatch ? usernameMatch[1] : null
      const english_level = levelMatch ? Number.parseInt(levelMatch[1]) : null
      const score = scoreMatch ? Number.parseInt(scoreMatch[1]) : null
      const totalScore = totalScoreMatch ? Number.parseInt(totalScoreMatch[1]) : null
      const feedback = feedbackMatch ? feedbackMatch[1].trim() : null

      console.log("Parsed result:", { username, english_level, score, totalScore, feedback })

      return {
        username,
        english_level,
        score,
        totalScore,
        feedback,
      }
    } catch (err) {
      console.error("Error parsing result message:", err)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !challenge) return

    setIsSubmitting(true)

    try {
      const response = await fetch("https://dev-academy.n8n.itelisoft.org/webhook/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: user.session_id,
          ejercicio: challenge.ejercicio,
          answer: answer,
          english_level: user.english_level,
        }),
      })

      const data = await response.text() // Cambiamos a .text() ya que es un mensaje de texto
      console.log("Result API Response:", data)

      if (response.ok) {
        const parsedResult = parseResultMessage(data)

        if (parsedResult && parsedResult.score !== null && parsedResult.totalScore !== null && parsedResult.feedback) {
          // Calculamos el score obtenido en este challenge
          const scoreEarned = parsedResult.score
          const newTotalScore = parsedResult.totalScore

          setResult({
            score: scoreEarned,
            totalScore: 10, // Máximo por challenge
            feedback: parsedResult.feedback,
          })

          // Update user data
          const updatedUser = {
            ...user,
            score: newTotalScore,
            english_level: parsedResult.english_level || user.english_level,
            challenges: [
              ...user.challenges,
              {
                descripcion: challenge.descripcion,
                ejercicio: challenge.ejercicio,
                answer: answer,
                score: scoreEarned,
                totalScore: 10,
                feedback: parsedResult.feedback,
                timestamp: new Date().toISOString(),
              },
            ],
          }

          // Check if user leveled up (cada 20 puntos)
          const oldLevel = Math.floor(user.score / 20) + 1
          const newLevel = Math.floor(newTotalScore / 20) + 1

          if (newLevel > oldLevel) {
            updatedUser.english_level = newLevel
            toast({
              title: "Level Up!",
              description: `Congratulations! You've advanced to level ${newLevel}!`,
            })
          }

          localStorage.setItem("user", JSON.stringify(updatedUser))
          setUser(updatedUser)

          toast({
            title: "Challenge Completed!",
            description: `You scored ${scoreEarned} points! Total score: ${newTotalScore}`,
          })
        } else {
          setError("Could not parse result from server")
        }
      } else {
        setError("Failed to submit answer")
      }
    } catch (err) {
      console.error("Error submitting answer:", err)
      setError("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNextChallenge = () => {
    if (!user) return

    setAnswer("")
    setResult(null)
    setError("")
    setChallenge(null)
    fetchNewChallenge(user)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        >
          <Brain className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    )
  }

  if (!user) return null

  // Calcular progreso al siguiente nivel (cada 20 puntos)
  const pointsToNextLevel = 20
  const currentLevelProgress = user.score % pointsToNextLevel
  const progress = (currentLevelProgress / pointsToNextLevel) * 100

  // Determinar colores y iconos basados en el score
  const getScoreColor = (score: number) => {
    if (score < 5) return "red"
    if (score >= 6) return "green"
    return "yellow"
  }

  const getScoreIcon = (score: number) => {
    if (score < 5) return X
    if (score >= 6) return Check
    return Star
  }

  return (
    <div className="container relative flex min-h-screen flex-col items-center justify-center py-10">
      <Link
        href="/dashboard"
        className="absolute left-4 top-4 flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to dashboard
      </Link>

      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div>
                <CardTitle className="text-xl">Level {user.english_level} Challenge</CardTitle>
                <CardDescription>Complete the exercise to earn points</CardDescription>
              </div>
              <motion.div
                className="rounded-full bg-primary/10 p-3"
                whileHover={{ scale: 1.1, rotate: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Brain className="h-6 w-6 text-primary" />
              </motion.div>
            </motion.div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="space-y-6">
              {error && (
                <motion.div
                  className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-600"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {challengeLoading ? (
                  <motion.div
                    key="loading"
                    className="flex flex-col items-center justify-center py-12 space-y-6"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      animate={{
                        rotate: 360,
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        rotate: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                        scale: { duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
                      }}
                    >
                      <Brain className="h-12 w-12 text-primary" />
                    </motion.div>
                    <motion.p
                      className="text-lg font-medium text-muted-foreground text-center"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    >
                      Generating your personalized challenge...
                    </motion.p>
                  </motion.div>
                ) : challenge ? (
                  <motion.div
                    key="challenge"
                    className="space-y-6"
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.95 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                      staggerChildren: 0.1,
                    }}
                  >
                    <motion.div
                      className="rounded-xl bg-gradient-to-r from-muted/50 to-muted p-6 border border-border/50"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <h3 className="font-semibold mb-3 text-primary flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        Description:
                      </h3>
                      <p className="text-sm leading-relaxed">{challenge.descripcion}</p>
                    </motion.div>

                    <motion.div
                      className="rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 p-6 border border-primary/20"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <h3 className="font-semibold mb-3 text-primary flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Exercise:
                      </h3>
                      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed bg-background/50 p-4 rounded-lg border">
                        {challenge.ejercicio}
                      </pre>
                    </motion.div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {result === null && challenge && !challengeLoading ? (
                  <motion.form
                    onSubmit={handleSubmit}
                    key="answer-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="space-y-4">
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                        <Textarea
                          placeholder="Type your answer here... ✍️"
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          disabled={isSubmitting}
                          required
                          rows={5}
                          className="resize-none border-2 focus:border-primary/50 transition-all duration-200"
                        />
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          className="w-full h-12 text-base font-medium"
                          disabled={isSubmitting || !answer.trim()}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Evaluating your answer...
                            </>
                          ) : (
                            "Submit Answer 🚀"
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </motion.form>
                ) : (
                  result && (
                    <motion.div
                      key="result"
                      className="space-y-6"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                        delay: 0.2,
                      }}
                    >
                      <motion.div
                        className={`rounded-xl p-8 border-2 ${
                          getScoreColor(result.score) === "green"
                            ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                            : getScoreColor(result.score) === "red"
                              ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                              : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
                        }`}
                        initial={{ scale: 0.5, rotate: -5 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 15,
                          delay: 0.3,
                        }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex flex-col items-center gap-6 text-center">
                          <motion.div
                            className={`rounded-full p-6 ${
                              getScoreColor(result.score) === "green"
                                ? "bg-green-100 dark:bg-green-900"
                                : getScoreColor(result.score) === "red"
                                  ? "bg-red-100 dark:bg-red-900"
                                  : "bg-yellow-100 dark:bg-yellow-900"
                            }`}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 20,
                              delay: 0.5,
                            }}
                          >
                            {React.createElement(getScoreIcon(result.score), {
                              className: `h-12 w-12 ${
                                getScoreColor(result.score) === "green"
                                  ? "text-green-600 dark:text-green-400"
                                  : getScoreColor(result.score) === "red"
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-yellow-600 dark:text-yellow-400"
                              }`,
                            })}
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                          >
                            <h3
                              className={`text-3xl font-bold mb-4 ${
                                getScoreColor(result.score) === "green"
                                  ? "text-green-700 dark:text-green-300"
                                  : getScoreColor(result.score) === "red"
                                    ? "text-red-700 dark:text-red-300"
                                    : "text-yellow-700 dark:text-yellow-300"
                              }`}
                            >
                              Score: {result.score}/{result.totalScore}
                            </h3>

                            <motion.div
                              className="max-w-md mx-auto"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.9 }}
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                {result.feedback}
                              </p>
                            </motion.div>
                          </motion.div>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button onClick={handleNextChallenge} className="w-full h-12 text-base font-medium">
                          Next Challenge 🎯
                        </Button>
                      </motion.div>
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>
          </CardContent>

          <CardFooter className="flex-col border-t bg-muted/30 px-6 py-4">
            <motion.div
              className="flex w-full items-center justify-between text-sm text-muted-foreground mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="font-medium">Total Score: {user.score}</div>
              <div className="font-medium">Level: {user.english_level}</div>
            </motion.div>
            <motion.div
              className="w-full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>Progress to next level</span>
                <span>
                  {currentLevelProgress}/{pointsToNextLevel} points
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
