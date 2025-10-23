"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestVerifyPage() {
  const [token, setToken] = useState("")
  const [email, setEmail] = useState("")
  const [captchaToken, setCaptchaToken] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testEndpoint = async (endpoint: string) => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          email,
          captchaToken,
        }),
      })

      const data = await response.json()
      setResult({
        endpoint,
        status: response.status,
        data,
      })
    } catch (error: any) {
      setResult({
        endpoint,
        error: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Action Links Verify Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Token</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your action link token"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="captcha">CAPTCHA Token</Label>
            <Input
              id="captcha"
              value={captchaToken}
              onChange={(e) => setCaptchaToken(e.target.value)}
              placeholder="Enter CAPTCHA token"
            />
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Button 
                onClick={() => testEndpoint("/api/action-links/verify-no-redis")}
                disabled={loading || !token || !email || !captchaToken}
              >
                Test No Redis
              </Button>
              
              <Button 
                onClick={() => testEndpoint("/api/action-links/verify-no-captcha")}
                disabled={loading || !token || !email || !captchaToken}
              >
                Test No CAPTCHA
              </Button>
              
              <Button 
                onClick={() => testEndpoint("/api/action-links/verify")}
                disabled={loading || !token || !email || !captchaToken}
              >
                Test Original
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => testEndpoint("/api/test-imports")}
                disabled={loading}
                variant="outline"
              >
                Test Imports
              </Button>
              
              <Button 
                onClick={() => testEndpoint("/api/test-connections")}
                disabled={loading}
                variant="outline"
              >
                Test Connections
              </Button>
            </div>
          </div>

          {loading && (
            <div className="text-center py-4">
              <div className="text-muted-foreground">Testing endpoint...</div>
            </div>
          )}

          {result && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
