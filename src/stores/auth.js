import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GOOGLE_CONFIG } from '@/config/google'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const accessToken = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const tokenClient = ref(null)
  const gapiInited = ref(false)
  const gisInited = ref(false)

  // Computed
  const isAuthenticated = computed(() => !!accessToken.value)
  const isReady = computed(() => gapiInited.value && gisInited.value)

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
      // Check for existing token in session storage
      const storedToken = sessionStorage.getItem('khata_access_token')
      const storedUser = sessionStorage.getItem('khata_user')
      if (storedToken && storedUser) {
        accessToken.value = storedToken
        user.value = JSON.parse(storedUser)
        gapi.client.setToken({ access_token: storedToken })
      }
      resolve()
    }
  }

  // Handle token response from Google
  async function handleTokenResponse(response) {
    if (response.error) {
      error.value = response.error
      isLoading.value = false
      return
    }

    accessToken.value = response.access_token
    sessionStorage.setItem('khata_access_token', response.access_token)
    
    // Set token for gapi client
    gapi.client.setToken({ access_token: response.access_token })

    // Fetch user info
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${response.access_token}` }
      })
      const userInfo = await userInfoResponse.json()
      user.value = userInfo
      sessionStorage.setItem('khata_user', JSON.stringify(userInfo))
    } catch (err) {
      console.error('Failed to fetch user info:', err)
    }

    isLoading.value = false
  }

  // Sign in
  function signIn() {
    isLoading.value = true
    error.value = null

    if (tokenClient.value) {
      // Request access token
      if (accessToken.value) {
        // Token exists, request with prompt
        tokenClient.value.requestAccessToken({ prompt: '' })
      } else {
        // No token, show consent screen
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
    user.value = null
    sessionStorage.removeItem('khata_access_token')
    sessionStorage.removeItem('khata_user')
    
    if (gapi.client) {
      gapi.client.setToken(null)
    }
  }

  // Check if token is valid
  async function validateToken() {
    if (!accessToken.value) return false

    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken.value}`)
      if (!response.ok) {
        signOut()
        return false
      }
      return true
    } catch {
      signOut()
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
