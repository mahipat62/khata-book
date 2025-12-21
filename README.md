# 📒 Khata Book - Personal & Business Account Management

A modern web application to manage your personal and business accounts (Khata) using Google Sheets as the backend database. Built with Vue 3, Vite, and Tailwind CSS, deployable on GitHub Pages.

![Khata Book](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### Core Functionality
- ✅ **Google OAuth 2.0 Authentication** - Secure login with your Google account
- ✅ **Google Sheets Integration** - Use Google Sheets as your database
- ✅ **CRUD Operations** - Create, Read, Update, Delete records
- ✅ **Multiple Khatas** - Manage multiple account books
- ✅ **Custom Columns** - Define your own data structure

### Data Management
- ✅ **Filtering** - Filter by date range, payment status, and search
- ✅ **Sorting** - Sort by any column (ascending/descending)
- ✅ **Summary Analytics** - Total credit, debit, balance, paid/unpaid
- ✅ **Real-time Sync** - Data syncs with Google Sheets

### User Experience
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile
- ✅ **Modern UI** - Clean, intuitive interface
- ✅ **Loading States** - Visual feedback during operations
- ✅ **Toast Notifications** - Success/error messages
- ✅ **Backup Support** - Duplicate sheets for backup

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pages (Static Host)                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Vue 3 + Vite SPA                     │ │
│  │  ┌───────────┐  ┌─────────────┐  ┌───────────────────┐ │ │
│  │  │   Views   │  │ Components  │  │      Stores       │ │ │
│  │  │ - Login   │  │ - DataTable │  │ - auth (Pinia)    │ │ │
│  │  │ - Dash    │  │ - Form      │  │ - sheets (Pinia)  │ │ │
│  │  │ - Sheets  │  │ - Modal     │  │ - toast (Pinia)   │ │ │
│  │  └───────────┘  └─────────────┘  └───────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Google Cloud Platform                      │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │  OAuth 2.0  │  │ Sheets API v4  │  │   Drive API v3   │ │
│  │  (GIS)      │  │ (CRUD)         │  │   (File mgmt)    │ │
│  └─────────────┘  └────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
khata-book/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment
├── public/
│   └── favicon.svg             # App icon
├── src/
│   ├── assets/
│   │   └── main.css            # Tailwind + custom styles
│   ├── components/
│   │   ├── DataTable.vue       # Data display table
│   │   ├── FilterPanel.vue     # Filtering controls
│   │   ├── LoadingOverlay.vue  # Loading state
│   │   ├── Modal.vue           # Reusable modal
│   │   ├── NavBar.vue          # Navigation header
│   │   ├── RecordForm.vue      # Add/Edit form
│   │   ├── SummaryCards.vue    # Analytics cards
│   │   └── ToastContainer.vue  # Notifications
│   ├── config/
│   │   └── google.js           # Google API configuration
│   ├── router/
│   │   └── index.js            # Vue Router setup
│   ├── stores/
│   │   ├── auth.js             # Authentication state
│   │   ├── sheets.js           # Sheets operations
│   │   └── toast.js            # Toast notifications
│   ├── views/
│   │   ├── DashboardView.vue   # Main dashboard
│   │   ├── LoginView.vue       # Login page
│   │   ├── SettingsView.vue    # Settings page
│   │   ├── SheetDetailView.vue # Sheet records view
│   │   └── SheetsView.vue      # Sheets list
│   ├── App.vue                 # Root component
│   └── main.js                 # App entry point
├── .env.example                # Environment template
├── index.html                  # HTML entry
├── package.json                # Dependencies
├── postcss.config.js           # PostCSS config
├── tailwind.config.js          # Tailwind config
└── vite.config.js              # Vite config
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Google account
- GitHub account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/khata-book.git
   cd khata-book
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Google Client ID
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

## 🔐 Google API Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Khata Book" and click "Create"

### Step 2: Enable Required APIs

1. Go to "APIs & Services" → "Library"
2. Search and enable:
   - **Google Sheets API**
   - **Google Drive API**

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type
3. Fill in required fields:
   - App name: `Khata Book`
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Add test users (your email) during development

### Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Name: `Khata Book Web`
5. Add Authorized JavaScript origins:
   ```
   http://localhost:5173
   https://YOUR_USERNAME.github.io
   ```
6. Add Authorized redirect URIs:
   ```
   http://localhost:5173
   https://YOUR_USERNAME.github.io/khata-book/
   ```
7. Click "Create" and copy the **Client ID**

### Step 5: Configure the App

Update your `.env.local` file:
```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Or update `src/config/google.js` directly:
```javascript
CLIENT_ID: 'your-client-id.apps.googleusercontent.com',
```

## 📦 GitHub Pages Deployment

### Method 1: Automatic Deployment (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/khata-book.git
   git push -u origin main
   ```

2. **Add GitHub Secrets**
   - Go to Repository → Settings → Secrets and variables → Actions
   - Add new secrets:
     - `VITE_GOOGLE_CLIENT_ID`: Your Google Client ID
     - `VITE_GOOGLE_API_KEY`: Your Google API Key (optional)

3. **Enable GitHub Pages**
   - Go to Repository → Settings → Pages
   - Source: **GitHub Actions**

4. **Deploy**
   - Push any change to `main` branch, or
   - Go to Actions → "Deploy to GitHub Pages" → "Run workflow"

5. **Access your app**
   ```
   https://YOUR_USERNAME.github.io/khata-book/
   ```

### Method 2: Manual Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to GitHub Pages

### Important: Update OAuth Redirect URLs

After deployment, add your GitHub Pages URL to Google Cloud Console:

1. Go to "APIs & Services" → "Credentials"
2. Edit your OAuth 2.0 Client ID
3. Add to Authorized JavaScript origins:
   ```
   https://YOUR_USERNAME.github.io
   ```
4. Add to Authorized redirect URIs:
   ```
   https://YOUR_USERNAME.github.io/khata-book/
   ```

## ⚠️ GitHub Pages Pitfalls & Fixes

| Issue | Solution |
|-------|----------|
| 404 on page refresh | App uses hash-based routing (`/#/dashboard`) |
| OAuth redirect fails | Add exact GitHub Pages URL to OAuth config |
| Assets not loading | `base` is set to `/khata-book/` in vite.config.js |
| API errors | Ensure APIs are enabled in Google Cloud |
| CORS issues | Google APIs support browser CORS by default |
| Token expiry | Tokens are stored in sessionStorage, re-login needed |

## 🔒 Security Notes

1. **Client ID is Public**: OAuth Client IDs are safe to expose in client-side code. They identify your app but don't grant access alone.

2. **No Secrets in Code**: Never commit API secrets. Use environment variables and GitHub Secrets.

3. **Token Storage**: Access tokens are stored in `sessionStorage` and cleared when browser closes.

4. **Scopes are Limited**: The app only requests necessary permissions (sheets and drive.file).

5. **User Data**: All data is stored in user's own Google Drive, not on any server.

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📱 Default Khata Columns

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| Date | date | Yes | Transaction date |
| Person Name | text | Yes | Customer/vendor name |
| Description | text | No | Transaction details |
| Amount | number | Yes | Transaction amount |
| Type | select | Yes | Credit or Debit |
| Paid | boolean | Yes | Payment status |
| Notes | text | No | Additional notes |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Vue.js](https://vuejs.org/) - The Progressive JavaScript Framework
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [Google APIs](https://developers.google.com/) - Google Sheets & Drive APIs

---

Made with ❤️ for better account management
