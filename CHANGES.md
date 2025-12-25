# Changelog

All notable changes to Dhanvika Vyavasāya will be documented in this file.

---

## [2.1.0] - 2024-12-25

### 🎨 UI/UX Improvements

- **Updated Header Logo**: Replaced old $ sign with the proper app icon (D with rupee symbol gradient logo)
- **Improved Mobile Navigation**: Added icons to bottom navigation bar with larger touch targets
- **Better Modal Experience**: Modals now slide up from bottom on mobile devices (sheet-style)
- **Alternating Table Rows**: Data tables now have alternating row colors (white/gray) for better readability
- **Enhanced Touch Targets**: Buttons and inputs are larger on mobile for easier interaction
- **Safe Area Support**: Added padding for notched devices (iPhone X and newer)

### ✨ New Features

- **Dashboard Sheet Selector**: Dropdown to select which sheet's data to display on dashboard
- **Earning/Expenditure Cards**: Separate gradient cards showing total earnings (green), expenditure (red), and net balance (blue)
- **Rename Sheet**: Option to rename existing Khata sheets
- **Duplicate Sheet Structure**: Create a new sheet with same column structure but empty data
- **Sheet Templates**: 4 preset templates when creating new sheets:
  - Standard Khata (full featured)
  - Credit Only (earnings focused)
  - Debit Only (expenses focused)
  - Simple Ledger (basic tracking)

### 📊 Analytics Page (New!)

- **Multi-Sheet Selection**: Toggle multiple sheets to combine analytics
- **Date Filters**: Filter by All Time, Daily, Weekly, Monthly, Yearly, or Custom Range
- **Bar Chart**: Visual comparison of credit vs debit amounts
- **Pie Chart**: Distribution breakdown of earnings and expenses
- **Top Performers**: Lists showing top 5 earners and top 5 spenders

### 🔐 Security & Session

- **Extended Session**: Login session now lasts 7 days (previously 1 hour with refresh)
- **Session Tracking**: Better session management with start time tracking
- **Silent Token Refresh**: Automatic token refresh without user intervention

### 🐛 Bug Fixes

- Fixed header logo showing old $ sign instead of app icon
- Improved session persistence across browser restarts

---

## [2.0.0] - 2024-12-23

### 🎉 Major Release - Rebranding

- **Rebranded**: Changed from "Khata Book" to "Dhanvika Vyavasāya"
- **New Logo**: Custom gradient logo with D and rupee symbol
- **PWA Support**: Added manifest.json and service worker for installable app
- **Google Drive Backup**: Automatic backup to Google Drive
- **Import/Export**: JSON backup and restore functionality

### 🔐 Authentication

- **Persistent Login**: Using localStorage instead of sessionStorage
- **Auto Token Refresh**: Automatic refresh before token expiry
- **Permission Handling**: Better handling of Google API permissions

---

## [1.0.0] - 2024-12-20

### 🚀 Initial Release

- Google Sheets integration for data storage
- CRUD operations for records
- Multiple sheet support
- Filter and search functionality
- Summary cards with totals
- Responsive design
- Dark mode support (via system preference)

---

## Legend

- 🎉 Major Release
- ✨ New Features
- 🎨 UI/UX Improvements
- 🐛 Bug Fixes
- 🔐 Security
- 📊 Analytics
- ⚡ Performance
