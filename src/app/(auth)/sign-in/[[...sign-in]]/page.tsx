import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your account'
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none",
          }
        }}
    
      />
    </div>
  )
}