import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GOOGLE_CONFIG } from '@/config/google'

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'dhanvika_access_token',
  TOKEN_EXPIRY: 'dhanvika_token_expiry',
  USER: 'dhanvika_user',
  SESSION_START: 'dhanvika_session_start'
}

// Session validity in milliseconds (7 days)
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const accessToken = ref(null)
  const tokenExpiry = ref(null)
  const sessionStart = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const tokenClient = ref(null)
  const gapiInited = ref(false)
  const gisInited = ref(false)

  // Computed
  const isAuthenticated = computed(() => !!accessToken.value && !isTokenExpired() && !isSessionExpired())
  const isReady = computed(() => gapiInited.value && gisInited.value)

  // Check if token is expired
  function isTokenExpired() {
    if (!tokenExpiry.value) return true
    // Add 5 minute buffer before expiry
    return Date.now() > (tokenExpiry.value - 5 * 60 * 1000)
  }

  // Check if session has expired (7 days)
  function isSessionExpired() {
    if (!sessionStart.value) return false // New session, not expired
    return Date.now() > (sessionStart.value + SESSION_DURATION)
  }

  // Initialize Google API
  async function initGoogleApi() {
    return new Promise((resolve, reject) => {
      // Load GAPI
      const gapiScript = document.createElement('script')
      gapiScript.src = 'https://apis.google.com/js/api.js'
      gapiScript.async = true
      gapiScript.defer = true
      gapiScript.onload = async () => {
        try {
          await new Promise((res) => gapi.load('client', res))
          await gapi.client.init({
            apiKey: GOOGLE_CONFIG.API_KEY,
            discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
          })
          gapiInited.value = true
          checkReady(resolve)
        } catch (err) {
          reject(err)
        }
      }
      document.body.appendChild(gapiScript)

      // Load GIS (Google Identity Services)
      const gisScript = document.createElement('script')
      gisScript.src = 'https://accounts.google.com/gsi/client'
      gisScript.async = true
      gisScript.defer = true
      gisScript.onload = () => {
        tokenClient.value = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CONFIG.CLIENT_ID,
          scope: GOOGLE_CONFIG.SCOPES,
          callback: handleTokenResponse,
        })
        gisInited.value = true
        checkReady(resolve)
      }
      document.body.appendChild(gisScript)
    })
  }

  function checkReady(resolve) {
    if (gapiInited.value && gisInited.value) {
      // Check for existing token in localStorage (persistent)
      const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      const storedExpiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY)
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER)
      const storedSessionStart = localStorage.getItem(STORAGE_KEYS.SESSION_START)
      
      if (storedToken && storedUser && storedExpiry) {
        const expiryTime = parseInt(storedExpiry, 10)
        const sessionStartTime = storedSessionStart ? parseInt(storedSessionStart, 10) : Date.now()
        
        // Check if session has expired (7 days limit)
        if (Date.now() > sessionStartTime + SESSION_DURATION) {
          console.log('[Auth] Session expired (7 days), clearing storage')
          clearAuthStorage()
          resolve()
          return
        }
        
        sessionStart.value = sessionStartTime
        
        // Check if token is still valid (with 5 min buffer)
        if (Date.now() < expiryTime - 5 * 60 * 1000) {
          accessToken.value = storedToken
          tokenExpiry.value = expiryTime
          user.value = JSON.parse(storedUser)
          gapi.client.setToken({ access_token: storedToken })
          console.log('[Auth] Restored session from storage')
        } else {
          // Token expired, try silent refresh
          console.log('[Auth] Token expired, will try silent refresh')
          silentRefresh()
        }
      }
      resolve()
    }
  }
  
  // Clear authentication storage
  function clearAuthStorage() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY)
    localStorage.removeItem(STORAGE_KEYS.USER)
    localStorage.removeItem(STORAGE_KEYS.SESSION_START)
  }

  // Handle token response from Google
  async function handleTokenResponse(response) {
    if (response.error) {
      error.value = response.error
      isLoading.value = false
      return
    }

    // Calculate token expiry (default 1 hour = 3600 seconds)
    const expiresIn = response.expires_in || 3600
    const expiryTime = Date.now() + (expiresIn * 1000)

    accessToken.value = response.access_token
    tokenExpiry.value = expiryTime
    
    // Set session start time if not already set (new login)
    if (!sessionStart.value) {
      sessionStart.value = Date.now()
      localStorage.setItem(STORAGE_KEYS.SESSION_START, sessionStart.value.toString())
    }
    
    // Store in localStorage for persistence across browser sessions
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token)
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString())
    
    // Set token for gapi client
    gapi.client.setToken({ access_token: response.access_token })

    // Fetch user info
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${response.access_token}` }
      })
      const userInfo = await userInfoResponse.json()
      user.value = userInfo
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userInfo))
    } catch (err) {
      console.error('Failed to fetch user info:', err)
    }

    isLoading.value = false
    
    // Set up auto-refresh before token expires
    scheduleTokenRefresh(expiresIn)
  }

  // Schedule automatic token refresh
  function scheduleTokenRefresh(expiresIn) {
    // Refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000
    if (refreshTime > 0) {
      setTimeout(() => {
        console.log('[Auth] Auto-refreshing token...')
        silentRefresh()
      }, refreshTime)
    }
  }

  // Silent refresh - try to get new token without user interaction
  function silentRefresh() {
    if (tokenClient.value) {
      try {
        // Use empty prompt for silent refresh (no popup if already authorized)
        tokenClient.value.requestAccessToken({ prompt: '' })
      } catch (err) {
        console.error('[Auth] Silent refresh failed:', err)
      }
    }
  }

  // Sign in - only show consent on first time
  function signIn() {
    isLoading.value = true
    error.value = null

    if (tokenClient.value) {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER)
      
      if (storedUser) {
        // User has signed in before, try silent sign in first
        tokenClient.value.requestAccessToken({ prompt: '' })
      } else {
        // First time user, show consent screen
        tokenClient.value.requestAccessToken({ prompt: 'consent' })
      }
    }
  }

  // Sign out
  function signOut() {
    if (accessToken.value) {
      google.accounts.oauth2.revoke(accessToken.value, () => {
        console.log('Token revoked')
      })
    }
    
    accessToken.value = null
    tokenExpiry.value = null
    sessionStart.value = null
    user.value = null
    
    // Clear localStorage
    clearAuthStorage()
    
    if (gapi.client) {
      gapi.client.setToken(null)
    }
  }

  // Check if token is valid
  async function validateToken() {
    if (!accessToken.value) return false
    if (isTokenExpired()) {
      // Try silent refresh
      silentRefresh()
      return false
    }

    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken.value}`)
      if (!response.ok) {
        // Token invalid, try silent refresh
        silentRefresh()
        return false
      }
      return true
    } catch {
      silentRefresh()
      return false
    }
  }

  return {
    // State
    user,
    accessToken,
    isLoading,
    error,
    gapiInited,
    gisInited,
    // Computed
    isAuthenticated,
    isReady,
    // Actions
    initGoogleApi,
    signIn,
    signOut,
    validateToken
  }
})
