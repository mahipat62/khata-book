// Google API Configuration
// Replace with your own Google Cloud Console credentials
export const GOOGLE_CONFIG = {
  // Your Google Cloud Console Client ID
  // Get it from: https://console.cloud.google.com/apis/credentials
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  
  // API Key (optional, but recommended for quota management)
  API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || '',
  
  // OAuth scopes required for the app
  SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ].join(' '),
  
  // Discovery docs for Google APIs
  DISCOVERY_DOCS: [
    'https://sheets.googleapis.com/$discovery/rest?version=v4',
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
  ],
  
  // App metadata folder name in Google Drive
  APP_FOLDER_NAME: 'Khata Book Data'
}

// Default Khata sheet columns
export const DEFAULT_COLUMNS = [
  { name: 'Date', type: 'date', required: true },
  { name: 'Person Name', type: 'text', required: true },
  { name: 'Description', type: 'text', required: false },
  { name: 'Amount', type: 'number', required: true },
  { name: 'Type', type: 'select', options: ['Credit', 'Debit'], required: true },
  { name: 'Paid', type: 'boolean', required: true },
  { name: 'Notes', type: 'text', required: false }
]

// App settings
export const APP_CONFIG = {
  APP_NAME: 'Khata Book',
  VERSION: '1.0.0',
  ITEMS_PER_PAGE: 25,
  DATE_FORMAT: 'YYYY-MM-DD',
  CURRENCY: '₹'
}
