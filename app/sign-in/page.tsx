import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center justify-center self-center">
          <img src="/images/aeroiq-logo.png" alt="AeroIQ Logo" className="h-8 w-auto" />
        </a>
        <LoginForm />
      </div>
    </div>
  )
}
