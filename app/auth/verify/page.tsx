export default function VerifyRequest() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-4 text-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Check your email</h2>
          <p className="mt-4 text-sm text-muted-foreground">
            A sign-in link and OTP code have been sent to your email address.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Click the link or enter the OTP code to complete sign-in.
          </p>
        </div>
        <div className="mt-8">
          <a
            href="/auth/signin"
            className="text-sm text-primary hover:text-primary/90"
          >
            ← Back to sign in
          </a>
        </div>
      </div>
    </div>
  )
}