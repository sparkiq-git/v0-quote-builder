"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "edge";


import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

/**
 * Helper to parse tokens from the URL hash: #access_token=...&refresh_token=...&type=invite
 */
function parseHashTokens(hash: string) {
  if (!hash || hash[0] !== "#") return null;
  const params = new URLSearchParams(hash.slice(1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const type = params.get("type");
  if (access_token && refresh_token) {
    return { access_token, refresh_token, type };
  }
  return null;
}

/**
 * Helper to parse fallback query string token (rarely needed, but nice to have)
 * Example: ?token=...&type=invite
 */
function parseQueryToken() {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");
  const type = url.searchParams.get("type");
  if (token && type === "invite") return { token, type };
  return null;
}

export default function SetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [phase, setPhase] = useState<
    "checking" | "need-session" | "ready" | "error"
  >("checking");
  const [error, setError] = useState<string | null>(null);

  // 1) Establish session from hash (preferred), or verifyOtp as a fallback.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        // Try hash tokens first
        const hashTokens = parseHashTokens(window.location.hash);
        if (hashTokens?.access_token && hashTokens?.refresh_token) {
          // Only run on client side
          if (typeof window === 'undefined') return;
          
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          
          const { data, error } = await supabase.auth.setSession({
            access_token: hashTokens.access_token,
            refresh_token: hashTokens.refresh_token,
          });
          if (cancelled) return;

          if (error) {
            setError(error.message);
            setPhase("error");
            return;
          }

          if (data.session) {
            // Clean the hash from the URL for a nicer UX
            window.history.replaceState({}, "", window.location.pathname);
            setPhase("ready");
            return;
          }
        }

        // Fallback: verifyOtp if the email client stripped the hash
        const qs = parseQueryToken();
        if (qs?.token && qs.type === "invite") {
          // Only run on client side
          if (typeof window === 'undefined') return;
          
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          
          const { data, error } = await supabase.auth.verifyOtp({
            type: "invite",
            token: qs.token,
          });
          if (cancelled) return;

          if (error) {
            setError(error.message);
            setPhase("error");
            return;
          }
          if (data.session) {
            setPhase("ready");
            return;
          }
        }

        // If neither worked, prompt user to re-open the link
        setPhase("need-session");
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Unexpected error during activation.");
        setPhase("error");
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      // Only run on client side
      if (typeof window === 'undefined') return;
      
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      router.push("/auth/sign-in");
    } catch (e: any) {
      setError(e?.message ?? "Failed to set password.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Activate your account</CardTitle>
          <CardDescription>
            {phase === "checking" && "Verifying your invitation…"}
            {phase === "ready" && "Set a password to complete your registration"}
            {phase === "need-session" && "We couldn’t establish a session from this link."}
            {phase === "error" && "There was a problem verifying your link."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {phase === "checking" && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {phase === "need-session" && (
            <div className="space-y-4 text-sm">
              <p>
                Your email client may have removed part of the link. Please tap the invite link
                again, or open it in a browser like Chrome or Safari. If the issue persists, ask
                your admin to resend the invitation.
              </p>
              <div className="text-center">
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="space-y-4 text-sm">
              <p>We couldn’t verify this invitation. It may be expired or already used.</p>
              <div className="text-center">
                <a
                  href="/auth/sign-in"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Go to sign in
                </a>
              </div>
            </div>
          )}

          {phase === "ready" && (
            <form onSubmit={handleSetPassword}>
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={false}
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={false}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Set Password
                </Button>

                <div className="text-center text-sm">
                  Already have an account?{" "}
                  <a
                    href="/auth/sign-in"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Sign in
                  </a>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-center text-xs text-balance">
        By setting your password, you agree to our{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>
        .
      </div>
    </div>
  );
}
