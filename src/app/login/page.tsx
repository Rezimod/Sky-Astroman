'use client'
import { useRouter } from 'next/navigation'
import AstroLogo from '@/components/shared/AstroLogo'

export default function LoginPage() {
  const router = useRouter()

  const handleLogin = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-page-enter">
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          <AstroLogo heightClass="h-10" />
          <h1 className="text-2xl font-bold text-white">Sign in to Sky Astroman</h1>
          <p className="text-sm text-[var(--text-secondary)]">Log observations, earn points, climb the leaderboard</p>
        </div>

        <div className="glass-card p-6 flex flex-col gap-4">
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[var(--border-glass)] bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border-glass)]" />
            <span className="text-xs text-[var(--text-dim)]">or</span>
            <div className="flex-1 h-px bg-[var(--border-glass)]" />
          </div>

          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-xl font-bold text-sm btn-primary"
          >
            Enter with Email →
          </button>

          <p className="text-center text-xs text-[var(--text-dim)]">
            No password needed. No crypto. No payments.
          </p>
        </div>
      </div>
    </div>
  )
}
