#!/usr/bin/env node

/**
 * Firebase to CSV Export Script
 *
 * Exports all Firestore collections to CSV files.
 * Uses the same Firebase config as the frontend.
 *
 * Usage:
 *   cd backend
 *   node scripts/export-firebase-to-csv.js
 *
 * Output:
 *   Creates CSV files in backend/exports/ folder
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase configuration (same as frontend)
const firebaseConfig = {
    apiKey: "AIzaSyAIuY4yQWR9oZujMvTGdiNqZeo4zzW9Cj4",
    authDomain: "gen-lang-client-0046318495.firebaseapp.com",
    projectId: "gen-lang-client-0046318495",
    storageBucket: "gen-lang-client-0046318495.firebasestorage.app",
    messagingSenderId: "282900830200",
    appId: "1:282900830200:web:96725193e4cb673de4a80d",
    measurementId: "G-MTHRPE9F67"
};

// App ID for Firestore path
const APP_ID = 'default-app-id';

// Collections to export
const COLLECTIONS = [
    'clients',
    'products',
    'deployments',
    'checklists',
    'releaseNotes',
    'config'
];

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'exports');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Convert Firestore timestamp to ISO string
 */
function convertTimestamp(value) {
    if (!value) return '';
    if (value.toDate) {
        return value.toDate().toISOString();
    }
    if (value.seconds) {
        return new Date(value.seconds * 1000).toISOString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    return value;
}

/**
 * Flatten nested objects for CSV export
 */
function flattenObject(obj, prefix = '') {
    const result = {};

    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value === null || value === undefined) {
            result[newKey] = '';
        } else if (value.toDate || value.seconds) {
            // Firestore timestamp
            result[newKey] = convertTimestamp(value);
        } else if (Array.isArray(value)) {
            // Convert arrays to JSON string
            result[newKey] = JSON.stringify(value);
        } else if (typeof value === 'object' && !Array.isArray(value)) {
            // Recursively flatten nested objects (but not too deep)
            if (prefix) {
                // Already nested, convert to JSON
                result[newKey] = JSON.stringify(value);
            } else {
                // First level nesting, flatten
                Object.assign(result, flattenObject(value, newKey));
            }
        } else {
            result[newKey] = value;
        }
    }

    return result;
}

/**
 * Escape CSV value
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Convert array of objects to CSV string
 */
function toCSV(data) {
    if (!data || data.length === 0) {
        return '';
    }

    // Get all unique keys from all objects
    const allKeys = new Set();
    data.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
    });

    // Sort keys for consistent output (id first, then alphabetically)
    const headers = Array.from(allKeys).sort((a, b) => {
        if (a === 'id') return -1;
        if (b === 'id') return 1;
        return a.localeCompare(b);
    });

    // Build CSV
    const lines = [];

    // Header row
    lines.push(headers.map(h => escapeCSV(h)).join(','));

    // Data rows
    for (const row of data) {
        const values = headers.map(h => escapeCSV(row[h]));
        lines.push(values.join(','));
    }

    return lines.join('\n');
}

/**
 * Export a single collection to CSV
 */
async function exportCollection(collectionName) {
    console.log(`  Exporting ${collectionName}...`);

    const collectionPath = `artifacts/${APP_ID}/public/data/${collectionName}`;
    const collectionRef = collection(db, collectionPath);

    try {
        const snapshot = await getDocs(collectionRef);

        if (snapshot.empty) {
            console.log(`    No documents found in ${collectionName}`);
            return { name: collectionName, count: 0, data: [] };
        }

        const documents = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const flatData = flattenObject({ id: doc.id, ...data });
            documents.push(flatData);
        });

        console.log(`    Found ${documents.length} documents`);

        return { name: collectionName, count: documents.length, data: documents };
    } catch (error) {
        console.error(`    Error exporting ${collectionName}:`, error.message);
        return { name: collectionName, count: 0, data: [], error: error.message };
    }
}

/**
 * Export all collections to JSON (complete backup)
 */
async function exportToJSON(collections) {
    const backup = {
        exportedAt: new Date().toISOString(),
        appId: APP_ID,
        collections: {}
    };

    for (const col of collections) {
        if (col.data.length > 0) {
            backup.collections[col.name] = col.data;
        }
    }

    const jsonPath = path.join(OUTPUT_DIR, 'firebase-backup.json');
    fs.writeFileSync(jsonPath, JSON.stringify(backup, null, 2));
    console.log(`\nJSON backup saved to: ${jsonPath}`);
}

/**
 * Main export function
 */
async function main() {
    console.log('='.repeat(50));
    console.log('Firebase to CSV Export');
    console.log('='.repeat(50));
    console.log(`\nFirebase Project: ${firebaseConfig.projectId}`);
    console.log(`App ID: ${APP_ID}`);
    console.log(`Output Directory: ${OUTPUT_DIR}\n`);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log('Created exports directory\n');
    }

    const results = [];

    // Export each collection
    console.log('Exporting collections:');
    for (const collectionName of COLLECTIONS) {
        const result = await exportCollection(collectionName);
        results.push(result);

        // Write CSV file
        if (result.data.length > 0) {
            const csv = toCSV(result.data);
            const csvPath = path.join(OUTPUT_DIR, `${collectionName}.csv`);
            fs.writeFileSync(csvPath, csv);
            console.log(`    Saved to: ${csvPath}`);
        }
    }

    // Also export as JSON for complete backup
    await exportToJSON(results);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Export Summary:');
    console.log('='.repeat(50));

    let totalDocs = 0;
    for (const result of results) {
        const status = result.error ? `ERROR: ${result.error}` : `${result.count} documents`;
        console.log(`  ${result.name}: ${status}`);
        totalDocs += result.count;
    }

    console.log(`\nTotal: ${totalDocs} documents exported`);
    console.log(`\nFiles saved in: ${OUTPUT_DIR}`);
    console.log('  - Individual CSV files for each collection');
    console.log('  - firebase-backup.json (complete backup)');
}

// Run the export
main()
    .then(() => {
        console.log('\nExport completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\nExport failed:', error);
        process.exit(1);
    });
