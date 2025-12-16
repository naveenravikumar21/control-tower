# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev       # Start development server with HMR
npm run build     # Build for production
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
npm run deploy    # Deploy to GitHub Pages (runs build first)
```

## Architecture Overview

This is a **Control Tower** dashboard application built with React 19, Vite, and Firebase. It's a single-page application for managing products, clients, deployments, and onboarding tasks.

### Tech Stack
- **React 19** with JSX (no TypeScript)
- **Vite 7** for bundling
- **Firebase** (Auth + Firestore) for backend
- **Tailwind CSS** via CDN (loaded in index.html)
- **Recharts** for data visualization
- **Lucide React** for icons

### Application Structure

The application uses a **modular component-based architecture** with extracted reusable widgets:

```
src/
├── App.jsx                    # Main application (pages remain here)
├── main.jsx                   # Entry point
├── constants/                 # Application constants
│   └── index.js               # STANDARD_CHECKLIST, DEPLOYMENT_STATUSES, AVATAR_COLORS, etc.
├── utils/                     # Utility functions
│   ├── index.js               # formatDate, getDaysDiff, getDeadlineStatus, exportToCSV, etc.
│   └── firebase.js            # Firebase config, db, auth, CRUD helpers
├── contexts/                  # React Context providers
│   ├── AuthContext.jsx        # Firebase authentication state
│   ├── ToastContext.jsx       # Toast notification system
│   ├── NavigationContext.jsx  # Client-side routing with keyboard shortcuts
│   ├── ThemeContext.jsx       # Dark/light mode toggle
│   └── index.js               # Re-exports all contexts
├── hooks/                     # Custom React hooks
│   ├── useCollection.js       # Generic Firestore collection subscriber
│   └── index.js
├── components/
│   ├── ui/                    # Reusable UI primitives
│   │   ├── Button.jsx         # Button with variants (primary, secondary, ghost, danger)
│   │   ├── Input.jsx          # Input, TextArea, Select components
│   │   ├── Card.jsx           # Base card component
│   │   ├── Badge.jsx          # Badge with colors, CustomTooltip
│   │   ├── ProgressBar.jsx    # Linear and CircularProgress
│   │   ├── SearchInput.jsx    # Search input with clear button
│   │   ├── ViewToggle.jsx     # Grid/Kanban view switcher
│   │   ├── Modal.jsx          # Modal and ConfirmationModal
│   │   ├── FilterTag.jsx      # Removable filter tags
│   │   ├── EmptyState.jsx     # Empty state placeholder
│   │   └── index.js           # Re-exports + Sparkles icon
│   ├── features/              # Feature-specific components
│   │   ├── KPICard.jsx        # Dashboard KPI metric cards
│   │   ├── DeploymentTile.jsx # Deployment card (StatusBadge, DeadlineBadge)
│   │   ├── DeploymentGridView.jsx
│   │   ├── DeploymentKanbanBoard.jsx
│   │   ├── DeploymentTrendChart.jsx
│   │   ├── TimelineStrip.jsx  # Horizontal timeline of upcoming releases
│   │   ├── ChecklistWidget.jsx # Release checklist with progress
│   │   ├── BlockedCommentsPanel.jsx # Threaded comments for blocked deployments
│   │   ├── HealthScoreRing.jsx # Client health score visualization
│   │   ├── CommandPalette.jsx # Global search (/ key)
│   │   └── index.js
│   ├── layout/                # Layout components
│   │   ├── Sidebar.jsx        # Desktop sidebar navigation
│   │   ├── MobileHeader.jsx   # Mobile header with drawer menu
│   │   ├── NavItem.jsx        # Navigation item component
│   │   └── index.js
│   └── index.js               # Re-exports all components
└── pages/                     # (Page components remain in App.jsx for now)
```

**Pages** (defined in App.jsx):
- `Dashboard`: Overview with charts, metrics, and timeline
- `Products`: Product CRUD with documentation links
- `Deployments`: Grid/Kanban views, deployment modal with quick actions
- `Clients`: Client management with health scores
- `Onboarding`: Onboarding progress tracking
- `Settings`: Google Sheets sync, CSV export

### Key Patterns

- **Navigation**: Custom client-side routing via `NavigationContext` (not React Router)
- **Keyboard shortcuts**: `g+h` (dashboard), `g+p` (products), `g+c` (clients), `g+d` (deployments), `g+o` (onboarding), `n` (new deployment)
- **Firestore path**: `artifacts/{appId}/public/data/{collection}`
- **Standard checklist**: 9-item deployment checklist defined in `STANDARD_CHECKLIST` constant

### Deployment

Configured for GitHub Pages deployment at `/control-tower/` base path (see `vite.config.js`).

---

## Google Sheets Sync Setup

The Control Tower supports bi-directional sync with Google Sheets for **Products**, **Deployments**, and **Clients**. Follow these steps to set it up:

### 1. Create Your Google Sheet

1. Create a new Google Sheet (or use an existing one)
2. The sync will automatically create 3 tabs with headers:
   - **Products** - Product catalog with documentation links
   - **Deployments** - Deployment tracking with status
   - **Clients** - Client information

### 2. Deploy the Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete any existing code and paste the entire script below
3. Click **Deploy → New deployment**
4. Select type: **Web app**
5. Set "Execute as": **Me**
6. Set "Who has access": **Anyone** (or your organization)
7. Click **Deploy** and authorize when prompted
8. Copy the Web app URL

### 3. Configure Control Tower

1. Go to Settings in Control Tower
2. Paste your Google Sheet URL
3. Paste the Apps Script Web App URL
4. Click "Save Settings"

### Apps Script Code

Copy this entire code into your Apps Script editor:

```javascript
/**
 * Control Tower - Google Sheets Sync
 *
 * This script provides a REST API for syncing data between
 * Control Tower and Google Sheets.
 *
 * IMPORTANT: Replace the SPREADSHEET_ID below with your actual spreadsheet ID!
 * You can find it in your Google Sheet URL:
 * https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID_HERE/edit
 */

// ⚠️ PASTE YOUR SPREADSHEET ID HERE ⚠️
const SPREADSHEET_ID = '1YitvnjldiSGvHYyPBtq5txUlpZbtxYuEQWQLMg0vs7Y';

// CORS headers for cross-origin requests
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Handle GET requests (read from sheet or test connection)
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action || 'read';
    const sheetName = params.sheetName || 'Products';

    // Test connection endpoint
    if (action === 'test') {
      return createResponse({ success: true, message: 'Apps Script is working!' });
    }

    // Check spreadsheet access
    if (action === 'checkAccess') {
      try {
        const ss = getSpreadsheet();
        if (!ss) {
          return createResponse({
            success: false,
            error: 'Cannot open spreadsheet. Check SPREADSHEET_ID is correct.',
            spreadsheetId: SPREADSHEET_ID
          });
        }

        const sheets = ss.getSheets().map(s => s.getName());
        return createResponse({
          success: true,
          spreadsheetId: SPREADSHEET_ID,
          spreadsheetName: ss.getName(),
          sheets: sheets,
          sheetCount: sheets.length
        });
      } catch (err) {
        return createResponse({
          success: false,
          error: 'Spreadsheet access error: ' + err.toString(),
          spreadsheetId: SPREADSHEET_ID
        });
      }
    }

    if (action === 'read') {
      return readSheet(sheetName);
    }

    return createResponse({ success: false, error: 'Unknown action' });
  } catch (error) {
    return createResponse({ success: false, error: error.toString() });
  }
}

// Handle POST requests (write to sheet)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'write';
    const sheetName = data.sheetName || 'Products';
    const rows = data.rows || [];

    if (action === 'write') {
      return writeSheet(sheetName, rows);
    }

    return createResponse({ success: false, error: 'Unknown action' });
  } catch (error) {
    return createResponse({ success: false, error: error.toString() });
  }
}

// Get the spreadsheet using the hardcoded ID
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    return null;
  }
}

// Read all data from a sheet (uses the spreadsheet the script is attached to)
function readSheet(sheetName) {
  const ss = getSpreadsheet();

  if (!ss) {
    return createResponse({ success: false, error: 'Could not access spreadsheet. Make sure the script is bound to a Google Sheet.' });
  }

  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return createResponse({ success: false, error: `Sheet "${sheetName}" not found` });
  }

  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return createResponse({ success: true, rows: [] });
  }

  const headers = data[0];
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j] || '';
    }
    // Only include rows with an ID
    if (row.id) {
      rows.push(row);
    }
  }

  return createResponse({ success: true, rows: rows });
}

// Get default headers based on sheet name
function getDefaultHeaders(sheetName) {
  const headerSets = {
    'Products': ['id', 'name', 'description', 'productOwner', 'engineeringOwner',
                 'nextReleaseDate', 'productGuide', 'releaseNotes', 'demoScript',
                 'testCases', 'productionChecklist', 'updatedAt'],
    'Deployments': ['id', 'clientId', 'clientName', 'productId', 'productName',
                    'status', 'deploymentType', 'nextDeliveryDate', 'notes', 'updatedAt'],
    'Clients': ['id', 'name', 'comments', 'updatedAt']
  };
  return headerSets[sheetName] || headerSets['Products'];
}

// Write/update data in a sheet (uses the spreadsheet the script is attached to)
function writeSheet(sheetName, rows) {
  const ss = getSpreadsheet();

  if (!ss) {
    return createResponse({ success: false, error: 'Could not access spreadsheet.' });
  }

  let sheet = ss.getSheetByName(sheetName);
  const defaultHeaders = getDefaultHeaders(sheetName);

  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Check if first row has headers - if empty or missing, add headers
  const firstCell = sheet.getRange(1, 1).getValue();
  if (!firstCell || firstCell.toString().trim() === '') {
    // Sheet is empty or has no headers - add them
    sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
  }

  // Now get all data including headers
  const existingData = sheet.getDataRange().getValues();
  const headers = existingData[0];
  const headerIndex = {};
  headers.forEach((h, i) => headerIndex[h] = i);

  // Create a map of existing rows by ID
  const existingRowMap = new Map();
  for (let i = 1; i < existingData.length; i++) {
    const id = existingData[i][headerIndex['id']];
    if (id) {
      existingRowMap.set(id.toString(), i + 1); // 1-indexed row number
    }
  }

  let updatedCount = 0;
  let addedCount = 0;

  // Update or add each row
  rows.forEach(row => {
    const rowData = headers.map(h => row[h] !== undefined ? row[h] : '');
    const rowId = row.id ? row.id.toString() : '';

    if (rowId && existingRowMap.has(rowId)) {
      // Update existing row
      const rowNum = existingRowMap.get(rowId);
      sheet.getRange(rowNum, 1, 1, rowData.length).setValues([rowData]);
      updatedCount++;
    } else if (rowData.some(v => v !== '')) {
      // Add new row only if it has some data
      sheet.appendRow(rowData);
      addedCount++;
    }
  });

  return createResponse({
    success: true,
    count: rows.length,
    updated: updatedCount,
    added: addedCount
  });
}

// Helper to create JSON response with CORS headers
function createResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// Test function - run this to verify the script works
function testScript() {
  Logger.log('Script loaded successfully!');
  Logger.log('Deploy as Web App to use with Control Tower.');
}
```

### Troubleshooting

- **"Permission denied"**: Make sure the Web App is deployed with "Anyone" access
- **"Sheet not found"**: The script will auto-create sheets with correct headers
- **CORS errors**: The Apps Script handles CORS automatically, but ensure you're using the correct Web App URL (ends with `/exec`)
- **Data not syncing**: Check the browser console for error messages

### Data Format

The sync supports three sheets/tabs:

#### Products Sheet

| Field | Description |
|-------|-------------|
| id | Firestore document ID |
| name | Product name |
| description | Product description |
| productOwner | Name of product owner |
| engineeringOwner | Name of engineering owner |
| nextReleaseDate | Target release date (YYYY-MM-DD) |
| productGuide | URL to product guide |
| releaseNotes | URL to release notes |
| demoScript | URL to demo script |
| testCases | URL to test cases |
| productionChecklist | URL to production checklist |
| updatedAt | ISO timestamp for conflict resolution |

#### Deployments Sheet

| Field | Description |
|-------|-------------|
| id | Firestore document ID |
| clientId | Reference to client ID |
| clientName | Client name (display only) |
| productId | Reference to product ID |
| productName | Product name (display only) |
| status | Not Started, In Progress, Blocked, Released |
| deploymentType | generic or client-specific |
| nextDeliveryDate | Target delivery date (YYYY-MM-DD) |
| notes | Deployment notes |
| updatedAt | ISO timestamp for conflict resolution |

#### Clients Sheet

| Field | Description |
|-------|-------------|
| id | Firestore document ID |
| name | Client name |
| comments | Notes about the client |
| updatedAt | ISO timestamp for conflict resolution |
