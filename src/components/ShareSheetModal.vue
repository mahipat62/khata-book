<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  sheetId: String,
  sheetName: String
})

const emit = defineEmits(['close', 'share'])

// Form state
const email = ref('')
const accessLevel = ref('reader') // 'reader' or 'writer'
const notifyUser = ref(true)
const customMessage = ref('')
const isSharing = ref(false)

// Shared users list (will be fetched)
const sharedUsers = ref([])
const isLoadingUsers = ref(false)

// Validation
const emailError = ref('')

const isValidEmail = computed(() => {
  if (!email.value) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

watch(email, () => {
  emailError.value = ''
})

// Load shared users when modal opens
watch(() => props.show, async (show) => {
  if (show && props.sheetId) {
    await loadSharedUsers()
  }
})

async function loadSharedUsers() {
  isLoadingUsers.value = true
  try {
    const response = await gapi.client.drive.permissions.list({
      fileId: props.sheetId,
      fields: 'permissions(id, emailAddress, displayName, role, type, photoLink)'
    })
    
    // Filter out owner and anyone permissions
    sharedUsers.value = (response.result.permissions || []).filter(p => 
      p.type === 'user' && p.role !== 'owner'
    )
  } catch (err) {
    console.error('Failed to load shared users:', err)
    sharedUsers.value = []
  } finally {
    isLoadingUsers.value = false
  }
}

async function shareSheet() {
  if (!isValidEmail.value) {
    emailError.value = 'Please enter a valid email address'
    return
  }

  isSharing.value = true
  try {
    // Create permission using Google Drive API
    await gapi.client.drive.permissions.create({
      fileId: props.sheetId,
      sendNotificationEmail: notifyUser.value,
      emailMessage: customMessage.value || undefined,
      resource: {
        type: 'user',
        role: accessLevel.value,
        emailAddress: email.value
      }
    })

    emit('share', {
      email: email.value,
      role: accessLevel.value,
      success: true
    })

    // Reset form and reload users
    email.value = ''
    customMessage.value = ''
    await loadSharedUsers()
  } catch (err) {
    console.error('Failed to share sheet:', err)
    emailError.value = err.result?.error?.message || 'Failed to share. Please check the email address.'
  } finally {
    isSharing.value = false
  }
}

async function removeAccess(permissionId, userEmail) {
  if (!confirm(`Remove access for ${userEmail}?`)) return

  try {
    await gapi.client.drive.permissions.delete({
      fileId: props.sheetId,
      permissionId: permissionId
    })
    await loadSharedUsers()
  } catch (err) {
    console.error('Failed to remove access:', err)
  }
}

async function updatePermission(permissionId, newRole) {
  try {
    await gapi.client.drive.permissions.update({
      fileId: props.sheetId,
      permissionId: permissionId,
      resource: {
        role: newRole
      }
    })
    await loadSharedUsers()
  } catch (err) {
    console.error('Failed to update permission:', err)
  }
}

function getRoleBadge(role) {
  switch (role) {
    case 'writer': return { text: '✏️ Can Edit', class: 'bg-blue-100 text-blue-700' }
    case 'reader': return { text: '👁️ View Only', class: 'bg-gray-100 text-gray-600' }
    case 'commenter': return { text: '💬 Can Comment', class: 'bg-yellow-100 text-yellow-700' }
    default: return { text: role, class: 'bg-gray-100 text-gray-600' }
  }
}

function close() {
  emit('close')
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <div>
          <h3 class="text-lg font-semibold text-gray-800">Share Sheet</h3>
          <p class="text-sm text-gray-500 truncate">{{ sheetName }}</p>
        </div>
        <button @click="close" class="p-2 hover:bg-gray-100 rounded-lg">
          <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-6">
        <!-- Share Form -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700">Add People</h4>
          
          <!-- Email Input -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" 
              v-model="email"
              placeholder="Enter email address"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              :class="emailError ? 'border-red-500' : 'border-gray-300'"
            />
            <p v-if="emailError" class="mt-1 text-sm text-red-600">{{ emailError }}</p>
          </div>

          <!-- Access Level -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Access Level</label>
            <div class="flex flex-col sm:flex-row gap-3">
              <label 
                class="flex-1 flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors"
                :class="accessLevel === 'reader' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'"
              >
                <input type="radio" v-model="accessLevel" value="reader" class="hidden" />
                <div class="w-8 h-8 rounded-full flex items-center justify-center" 
                     :class="accessLevel === 'reader' ? 'bg-primary-100' : 'bg-gray-100'">
                  <span class="text-lg">👁️</span>
                </div>
                <div>
                  <div class="font-medium text-gray-800">Viewer</div>
                  <div class="text-xs text-gray-500">Can view data only</div>
                </div>
              </label>
              
              <label 
                class="flex-1 flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors"
                :class="accessLevel === 'writer' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'"
              >
                <input type="radio" v-model="accessLevel" value="writer" class="hidden" />
                <div class="w-8 h-8 rounded-full flex items-center justify-center"
                     :class="accessLevel === 'writer' ? 'bg-blue-100' : 'bg-gray-100'">
                  <span class="text-lg">✏️</span>
                </div>
                <div>
                  <div class="font-medium text-gray-800">Editor</div>
                  <div class="text-xs text-gray-500">Can add & edit entries</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Notify Option -->
          <div class="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="notifyUser"
              v-model="notifyUser"
              class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label for="notifyUser" class="text-sm text-gray-700">Send email notification</label>
          </div>

          <!-- Custom Message (shown if notify is checked) -->
          <div v-if="notifyUser">
            <label class="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
            <textarea 
              v-model="customMessage"
              placeholder="Add a personal message..."
              rows="2"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            ></textarea>
          </div>

          <!-- Share Button -->
          <button 
            @click="shareSheet"
            :disabled="!isValidEmail || isSharing"
            class="w-full btn-primary flex items-center justify-center space-x-2"
            :class="{ 'opacity-50 cursor-not-allowed': !isValidEmail || isSharing }"
          >
            <svg v-if="isSharing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>{{ isSharing ? 'Sharing...' : 'Share' }}</span>
          </button>
        </div>

        <!-- Divider -->
        <div class="border-t border-gray-200"></div>

        <!-- Shared Users List -->
        <div>
          <h4 class="text-sm font-semibold text-gray-700 mb-3">People with Access</h4>
          
          <div v-if="isLoadingUsers" class="flex items-center justify-center py-4">
            <svg class="w-6 h-6 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>

          <div v-else-if="sharedUsers.length === 0" class="text-center py-4 text-gray-500">
            <svg class="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p class="text-sm">Not shared with anyone yet</p>
          </div>

          <div v-else class="space-y-2">
            <div 
              v-for="user in sharedUsers" 
              :key="user.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center space-x-3 min-w-0">
                <img 
                  v-if="user.photoLink" 
                  :src="user.photoLink" 
                  :alt="user.displayName"
                  class="w-8 h-8 rounded-full"
                />
                <div v-else class="w-8 h-8 bg-primary-200 rounded-full flex items-center justify-center">
                  <span class="text-sm text-primary-700 font-bold">
                    {{ (user.displayName || user.emailAddress)?.[0]?.toUpperCase() || '?' }}
                  </span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">
                    {{ user.displayName || user.emailAddress }}
                  </p>
                  <p class="text-xs text-gray-500 truncate">{{ user.emailAddress }}</p>
                </div>
              </div>
              
              <div class="flex items-center space-x-2 flex-shrink-0">
                <!-- Role Selector -->
                <select 
                  :value="user.role"
                  @change="updatePermission(user.id, $event.target.value)"
                  class="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                >
                  <option value="reader">👁️ Viewer</option>
                  <option value="writer">✏️ Editor</option>
                </select>
                
                <!-- Remove Button -->
                <button 
                  @click="removeAccess(user.id, user.emailAddress)"
                  class="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  title="Remove access"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Box -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div class="flex items-start space-x-2">
            <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-sm text-blue-700">
              <p class="font-medium">About sharing:</p>
              <ul class="mt-1 text-xs space-y-1">
                <li>• <strong>Viewers</strong> can see all data but cannot make changes</li>
                <li>• <strong>Editors</strong> can add, edit, and delete entries</li>
                <li>• Both users will work on the same Google Sheet in real-time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end p-4 border-t bg-gray-50">
        <button 
          @click="close"
          class="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
