import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn()
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  GoogleAuthProvider: vi.fn(() => ({
    setCustomParameters: vi.fn()
  })),
  signInWithPopup: vi.fn(),
  signOut: vi.fn()
}))

// Global mock setup
beforeEach(() => {
  // Mock environment variables
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'test-api-key')
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com')
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'test-project')
  vi.stubEnv('NEXT_PUBLIC_ALLOWED_EMAILS', 'allowed@gmail.com,admin@example.com')
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})
