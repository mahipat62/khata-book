<script setup>
import { computed, ref } from 'vue'
import { APP_CONFIG } from '@/config/google'

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  columns: {
    type: Array,
    default: () => []
  }
})

const currency = APP_CONFIG.CURRENCY

// Tooltip state
const activeTooltip = ref(null)

function showTooltip(id) {
  activeTooltip.value = id
}

function hideTooltip() {
  activeTooltip.value = null
}

// Find amount and paid columns
const amountColumn = computed(() => {
  return props.columns.find(c => c.name.toLowerCase().includes('amount'))?.name || 'Amount'
})

const paidColumn = computed(() => {
  return props.columns.find(c => c.type === 'boolean')?.name || null
})

const paidColumnLabels = computed(() => {
  const col = props.columns.find(c => c.type === 'boolean')
  return {
    yes: col?.booleanLabels?.yes || 'Yes',
    no: col?.booleanLabels?.no || 'No'
  }
})

const typeColumn = computed(() => {
  return props.columns.find(c => 
    c.name.toLowerCase().includes('type') && c.type === 'select'
  )?.name || null
})

// Detect sheet type based on data and columns
const sheetType = computed(() => {
  // Check if there's a Type column with Credit/Debit options
  if (typeColumn.value) {
    const types = new Set(props.data.map(row => row[typeColumn.value]))
    const hasCredit = types.has('Credit')
    const hasDebit = types.has('Debit')
    
    if (hasCredit && hasDebit) return 'mixed'
    if (hasCredit && !hasDebit) return 'credit-only'
    if (hasDebit && !hasCredit) return 'debit-only'
  }
  
  // Check column names for hints
  const colNames = props.columns.map(c => c.name.toLowerCase()).join(' ')
  if (colNames.includes('received') && !colNames.includes('paid')) return 'credit-only'
  if (colNames.includes('expense') || (colNames.includes('paid') && !colNames.includes('received'))) return 'debit-only'
  
  return 'simple' // No Type column - just show totals
})

// Calculate summaries
const totalRecords = computed(() => props.data.length)

const totalAmount = computed(() => {
  return props.data.reduce((sum, row) => {
    const amount = parseFloat(row[amountColumn.value]) || 0
    return sum + amount
  }, 0)
})

const totalCredit = computed(() => {
  if (!typeColumn.value) return 0
  return props.data
    .filter(row => row[typeColumn.value] === 'Credit')
    .reduce((sum, row) => {
      const amount = parseFloat(row[amountColumn.value]) || 0
      return sum + amount
    }, 0)
})

const totalDebit = computed(() => {
  if (!typeColumn.value) return 0
  return props.data
    .filter(row => row[typeColumn.value] === 'Debit')
    .reduce((sum, row) => {
      const amount = parseFloat(row[amountColumn.value]) || 0
      return sum + amount
    }, 0)
})

// Helper to check if value matches "yes" label
function isPositiveStatus(value) {
  const yesLabel = paidColumnLabels.value.yes
  return value === yesLabel || value === 'Yes' || value === true || value === 'TRUE'
}

function isNegativeStatus(value) {
  const noLabel = paidColumnLabels.value.no
  return value === noLabel || value === 'No' || value === false || value === 'FALSE' || !value
}

const paidAmount = computed(() => {
  if (!paidColumn.value) return 0
  return props.data
    .filter(row => isPositiveStatus(row[paidColumn.value]))
    .reduce((sum, row) => {
      const amount = parseFloat(row[amountColumn.value]) || 0
      return sum + amount
    }, 0)
})

const unpaidAmount = computed(() => {
  if (!paidColumn.value) return 0
  return props.data
    .filter(row => isNegativeStatus(row[paidColumn.value]))
    .reduce((sum, row) => {
      const amount = parseFloat(row[amountColumn.value]) || 0
      return sum + amount
    }, 0)
})

const paidCount = computed(() => {
  if (!paidColumn.value) return 0
  return props.data.filter(row => isPositiveStatus(row[paidColumn.value])).length
})

const unpaidCount = computed(() => {
  if (!paidColumn.value) return 0
  return props.data.filter(row => isNegativeStatus(row[paidColumn.value])).length
})

const balance = computed(() => totalCredit.value - totalDebit.value)

function formatAmount(amount) {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Tooltip content
const tooltips = computed(() => ({
  totalRecords: 'Total number of entries in this sheet',
  totalAmount: `Sum of all "${amountColumn.value}" values in the sheet`,
  totalCredit: `Sum of "${amountColumn.value}" where "${typeColumn.value}" = Credit`,
  totalDebit: `Sum of "${amountColumn.value}" where "${typeColumn.value}" = Debit`,
  balance: 'Total Credit − Total Debit. Positive means you earned more, negative means you spent more.',
  paid: `Sum of "${amountColumn.value}" where "${paidColumn.value}" = ${paidColumnLabels.value.yes}`,
  unpaid: `Sum of "${amountColumn.value}" where "${paidColumn.value}" = ${paidColumnLabels.value.no}`
}))
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
    <!-- Total Records - Always show -->
    <div 
      class="bg-white rounded-lg shadow-sm border p-4 relative cursor-pointer hover:shadow-md transition-shadow"
      @mouseenter="showTooltip('totalRecords')"
      @mouseleave="hideTooltip()"
      @click="showTooltip(activeTooltip === 'totalRecords' ? null : 'totalRecords')"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
            Total Records
            <svg class="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </p>
          <p class="text-2xl font-bold text-gray-800">{{ totalRecords }}</p>
        </div>
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>
      <!-- Tooltip -->
      <div v-if="activeTooltip === 'totalRecords'" class="absolute left-0 right-0 top-full mt-2 z-10 bg-gray-800 text-white text-xs rounded-lg p-2 shadow-lg">
        {{ tooltips.totalRecords }}
        <div class="absolute -top-1 left-4 w-2 h-2 bg-gray-800 rotate-45"></div>
      </div>
    </div>

    <!-- Total Amount - Show for simple sheets without Type column -->
    <div 
      v-if="sheetType === 'simple'"
      class="bg-white rounded-lg shadow-sm border p-4 relative cursor-pointer hover:shadow-md transition-shadow"
      @mouseenter="showTooltip('totalAmount')"
      @mouseleave="hideTooltip()"
      @click="showTooltip(activeTooltip === 'totalAmount' ? null : 'totalAmount')"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
            Total Amount
            <svg class="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </p>
          <p class="text-2xl font-bold text-primary-600">{{ currency }}{{ formatAmount(totalAmount) }}</p>
        </div>
        <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div v-if="activeTooltip === 'totalAmount'" class="absolute left-0 right-0 top-full mt-2 z-10 bg-gray-800 text-white text-xs rounded-lg p-2 shadow-lg">
        {{ tooltips.totalAmount }}
        <div class="absolute -top-1 left-4 w-2 h-2 bg-gray-800 rotate-45"></div>
      </div>
    </div>

    <!-- Total Credit - Show for mixed or credit-only sheets -->
    <div 
      v-if="sheetType === 'mixed' || sheetType === 'credit-only'"
      class="bg-white rounded-lg shadow-sm border p-4 relative cursor-pointer hover:shadow-md transition-shadow"
      @mouseenter="showTooltip('totalCredit')"
      @mouseleave="hideTooltip()"
      @click="showTooltip(activeTooltip === 'totalCredit' ? null : 'totalCredit')"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
            {{ sheetType === 'credit-only' ? 'Total Earnings' : 'Total Credit' }}
            <svg class="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </p>
          <p class="text-2xl font-bold text-green-600">{{ currency }}{{ formatAmount(sheetType === 'credit-only' ? totalAmount : totalCredit) }}</p>
        </div>
        <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>
      <div v-if="activeTooltip === 'totalCredit'" class="absolute left-0 right-0 top-full mt-2 z-10 bg-gray-800 text-white text-xs rounded-lg p-2 shadow-lg">
        {{ sheetType === 'credit-only' ? tooltips.totalAmount : tooltips.totalCredit }}
        <div class="absolute -top-1 left-4 w-2 h-2 bg-gray-800 rotate-45"></div>
      </div>
    </div>

    <!-- Total Debit - Show for mixed or debit-only sheets -->
    <div 
      v-if="sheetType === 'mixed' || sheetType === 'debit-only'"
      class="bg-white rounded-lg shadow-sm border p-4 relative cursor-pointer hover:shadow-md transition-shadow"
      @mouseenter="showTooltip('totalDebit')"
      @mouseleave="hideTooltip()"
      @click="showTooltip(activeTooltip === 'totalDebit' ? null : 'totalDebit')"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
            {{ sheetType === 'debit-only' ? 'Total Expenses' : 'Total Debit' }}
            <svg class="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </p>
          <p class="text-2xl font-bold text-red-600">{{ currency }}{{ formatAmount(sheetType === 'debit-only' ? totalAmount : totalDebit) }}</p>
        </div>
        <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </div>
      </div>
      <div v-if="activeTooltip === 'totalDebit'" class="absolute left-0 right-0 top-full mt-2 z-10 bg-gray-800 text-white text-xs rounded-lg p-2 shadow-lg">
        {{ sheetType === 'debit-only' ? tooltips.totalAmount : tooltips.totalDebit }}
        <div class="absolute -top-1 left-4 w-2 h-2 bg-gray-800 rotate-45"></div>
      </div>
    </div>

    <!-- Balance - Only for mixed sheets with both credit and debit -->
    <div 
      v-if="sheetType === 'mixed'"
      class="bg-white rounded-lg shadow-sm border p-4 relative cursor-pointer hover:shadow-md transition-shadow"
      @mouseenter="showTooltip('balance')"
      @mouseleave="hideTooltip()"
      @click="showTooltip(activeTooltip === 'balance' ? null : 'balance')"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
            Net Balance
            <svg class="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </p>
          <p :class="['text-2xl font-bold', balance >= 0 ? 'text-green-600' : 'text-red-600']">
            {{ currency }}{{ formatAmount(Math.abs(balance)) }}
            <span class="text-sm">{{ balance >= 0 ? '↑' : '↓' }}</span>
          </p>
        </div>
        <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', balance >= 0 ? 'bg-green-100' : 'bg-red-100']">
          <svg :class="['w-5 h-5', balance >= 0 ? 'text-green-600' : 'text-red-600']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
      <div v-if="activeTooltip === 'balance'" class="absolute left-0 right-0 top-full mt-2 z-10 bg-gray-800 text-white text-xs rounded-lg p-2 shadow-lg">
        {{ tooltips.balance }}
        <div class="absolute -top-1 left-4 w-2 h-2 bg-gray-800 rotate-45"></div>
      </div>
    </div>

    <!-- Paid/Received - Show if there's a boolean column -->
    <div 
      v-if="paidColumn"
      class="bg-white rounded-lg shadow-sm border p-4 relative cursor-pointer hover:shadow-md transition-shadow"
      @mouseenter="showTooltip('paid')"
      @mouseleave="hideTooltip()"
      @click="showTooltip(activeTooltip === 'paid' ? null : 'paid')"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
            {{ paidColumnLabels.yes }} ({{ paidCount }})
            <svg class="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </p>
          <p class="text-2xl font-bold text-emerald-600">{{ currency }}{{ formatAmount(paidAmount) }}</p>
        </div>
        <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <div v-if="activeTooltip === 'paid'" class="absolute left-0 right-0 top-full mt-2 z-10 bg-gray-800 text-white text-xs rounded-lg p-2 shadow-lg">
        {{ tooltips.paid }}
        <div class="absolute -top-1 left-4 w-2 h-2 bg-gray-800 rotate-45"></div>
      </div>
    </div>

    <!-- Unpaid/Pending - Show if there's a boolean column -->
    <div 
      v-if="paidColumn"
      class="bg-white rounded-lg shadow-sm border p-4 relative cursor-pointer hover:shadow-md transition-shadow"
      @mouseenter="showTooltip('unpaid')"
      @mouseleave="hideTooltip()"
      @click="showTooltip(activeTooltip === 'unpaid' ? null : 'unpaid')"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
            {{ paidColumnLabels.no }} ({{ unpaidCount }})
            <svg class="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </p>
          <p class="text-2xl font-bold text-orange-600">{{ currency }}{{ formatAmount(unpaidAmount) }}</p>
        </div>
        <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div v-if="activeTooltip === 'unpaid'" class="absolute left-0 right-0 top-full mt-2 z-10 bg-gray-800 text-white text-xs rounded-lg p-2 shadow-lg">
        {{ tooltips.unpaid }}
        <div class="absolute -top-1 left-4 w-2 h-2 bg-gray-800 rotate-45"></div>
      </div>
    </div>
  </div>
</template>
