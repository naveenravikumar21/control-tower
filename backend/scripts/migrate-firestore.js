#!/usr/bin/env node

/**
 * Firestore to PostgreSQL Migration Script
 *
 * This script migrates data from Firebase Firestore to PostgreSQL.
 *
 * Prerequisites:
 * 1. Place your Firebase service account JSON file at:
 *    backend/scripts/firebase-service-account.json
 *
 * 2. Update the APP_ID constant below to match your Firebase app ID
 *    (found in src/utils/firebase.js)
 *
 * Usage:
 *   cd backend
 *   npm run migrate-firestore
 */

require("dotenv").config({ path: "../.env" });

const admin = require("firebase-admin");
const knex = require("knex");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

// ===== CONFIGURATION =====
// Update this to match your Firebase app ID from src/utils/firebase.js
const APP_ID = "control-tower-app";

// Path to service account file
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "firebase-service-account.json");

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || "postgres://db1usr:db1pwd@linemeup.in/control_tower";

// ===== INITIALIZATION =====
let db;
let firestore;

async function initFirebase() {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        console.error("ERROR: Firebase service account file not found!");
        console.error(`Expected path: ${SERVICE_ACCOUNT_PATH}`);
        console.error("\nTo get this file:");
        console.error("1. Go to Firebase Console > Project Settings > Service Accounts");
        console.error("2. Click 'Generate new private key'");
        console.error("3. Save the file as 'firebase-service-account.json' in the scripts folder");
        process.exit(1);
    }

    const serviceAccount = require(SERVICE_ACCOUNT_PATH);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    firestore = admin.firestore();
    console.log("Firebase initialized successfully");
}

function initDatabase() {
    db = knex({
        client: "pg",
        connection: DATABASE_URL,
        pool: { min: 2, max: 10 }
    });
    console.log("Database connection initialized");
}

// ===== HELPER FUNCTIONS =====

function convertTimestamp(firestoreTimestamp) {
    if (!firestoreTimestamp) return null;
    if (firestoreTimestamp.toDate) {
        return firestoreTimestamp.toDate();
    }
    if (firestoreTimestamp instanceof Date) {
        return firestoreTimestamp;
    }
    return new Date(firestoreTimestamp);
}

function generateUUID() {
    return uuidv4();
}

// ===== MIGRATION FUNCTIONS =====

async function migrateClients() {
    console.log("\n--- Migrating Clients ---");

    const snapshot = await firestore
        .collection(`artifacts/${APP_ID}/public/data/clients`)
        .get();

    const idMap = new Map();
    const records = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const newId = generateUUID();
        idMap.set(doc.id, newId);

        records.push({
            id: newId,
            name: data.name || "",
            comments: data.comments || null,
            created_at: convertTimestamp(data.createdAt) || new Date(),
            updated_at: convertTimestamp(data.updatedAt) || new Date()
        });
    }

    if (records.length > 0) {
        await db("clients").insert(records);
    }

    console.log(`  Migrated ${records.length} clients`);
    return idMap;
}

async function migrateProducts() {
    console.log("\n--- Migrating Products ---");

    const snapshot = await firestore
        .collection(`artifacts/${APP_ID}/public/data/products`)
        .get();

    const idMap = new Map();
    const records = [];

    // First pass: Create ID mappings and prepare records without parent_id
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const newId = generateUUID();
        idMap.set(doc.id, newId);

        records.push({
            _oldParentId: data.parentId, // Temporary field for second pass
            id: newId,
            name: data.name || "",
            description: data.description || null,
            product_owner: data.productOwner || null,
            engineering_owner: data.engineeringOwner || null,
            next_release_date: data.nextReleaseDate || null,
            parent_id: null, // Will be set in second pass
            documentation: data.documentation || {},
            relevant_docs: data.relevantDocs || {},
            eap: data.eap || null,
            is_adapter: data.isAdapter || false,
            has_equipment_sa: data.hasEquipmentSA || false,
            has_equipment_se: data.hasEquipmentSE || false,
            has_mapping_service: data.hasMappingService || false,
            has_construction_service: data.hasConstructionService || false,
            notification_emails: data.notificationEmails || [],
            notes: data.notes || [],
            created_at: convertTimestamp(data.createdAt) || new Date(),
            updated_at: convertTimestamp(data.updatedAt) || new Date()
        });
    }

    // Insert records without parent references first
    if (records.length > 0) {
        const insertRecords = records.map(({ _oldParentId, ...rest }) => rest);
        await db("products").insert(insertRecords);

        // Second pass: Update parent_id references
        for (const record of records) {
            if (record._oldParentId) {
                const newParentId = idMap.get(record._oldParentId);
                if (newParentId) {
                    await db("products")
                        .where({ id: record.id })
                        .update({ parent_id: newParentId });
                }
            }
        }
    }

    console.log(`  Migrated ${records.length} products`);
    return idMap;
}

async function migrateDeployments(clientIdMap, productIdMap) {
    console.log("\n--- Migrating Deployments ---");

    const snapshot = await firestore
        .collection(`artifacts/${APP_ID}/public/data/deployments`)
        .get();

    const idMap = new Map();
    const records = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const newId = generateUUID();
        idMap.set(doc.id, newId);

        // Map client and product IDs
        const clientId = data.clientId ? clientIdMap.get(data.clientId) : null;
        const productId = productIdMap.get(data.productId);

        if (!productId) {
            console.warn(`  Warning: Deployment ${doc.id} has invalid productId ${data.productId}, skipping`);
            continue;
        }

        records.push({
            id: newId,
            client_id: clientId,
            product_id: productId,
            status: data.status || "Not Started",
            deployment_type: data.deploymentType || "feature-release",
            environment: data.environment || "production",
            next_delivery_date: data.nextDeliveryDate || null,
            feature_name: data.featureName || null,
            release_items: data.releaseItems || null,
            notes: data.notes || [],
            blocked_comments: data.blockedComments || [],
            status_history: data.statusHistory || [],
            equipment_sa_status: data.equipmentSAStatus || null,
            equipment_se_status: data.equipmentSEStatus || null,
            mapping_status: data.mappingStatus || null,
            construction_status: data.constructionStatus || null,
            created_at: convertTimestamp(data.createdAt) || new Date(),
            updated_at: convertTimestamp(data.updatedAt) || new Date()
        });
    }

    if (records.length > 0) {
        await db("deployments").insert(records);
    }

    console.log(`  Migrated ${records.length} deployments`);
    return idMap;
}

async function migrateChecklists(deploymentIdMap) {
    console.log("\n--- Migrating Checklists ---");

    const snapshot = await firestore
        .collection(`artifacts/${APP_ID}/public/data/checklists`)
        .get();

    const records = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const deploymentId = deploymentIdMap.get(data.deploymentId);

        if (!deploymentId) {
            console.warn(`  Warning: Checklist ${doc.id} has invalid deploymentId ${data.deploymentId}, skipping`);
            continue;
        }

        records.push({
            id: generateUUID(),
            deployment_id: deploymentId,
            item: data.item || data.title || "",
            is_completed: data.isCompleted || false,
            order: data.order || 0,
            created_at: convertTimestamp(data.createdAt) || new Date(),
            updated_at: convertTimestamp(data.updatedAt) || new Date()
        });
    }

    if (records.length > 0) {
        await db("checklists").insert(records);
    }

    console.log(`  Migrated ${records.length} checklist items`);
}

async function migrateReleaseNotes(productIdMap) {
    console.log("\n--- Migrating Release Notes ---");

    const snapshot = await firestore
        .collection(`artifacts/${APP_ID}/public/data/releaseNotes`)
        .get();

    const records = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const productId = productIdMap.get(data.productId);

        if (!productId) {
            console.warn(`  Warning: Release note ${doc.id} has invalid productId ${data.productId}, skipping`);
            continue;
        }

        records.push({
            id: generateUUID(),
            product_id: productId,
            version: data.version || "",
            release_date: data.releaseDate || null,
            title: data.title || null,
            summary: data.summary || null,
            items: data.items || [],
            history: data.history || [],
            created_at: convertTimestamp(data.createdAt) || new Date(),
            updated_at: convertTimestamp(data.updatedAt) || new Date()
        });
    }

    if (records.length > 0) {
        await db("release_notes").insert(records);
    }

    console.log(`  Migrated ${records.length} release notes`);
}

async function migrateConfig() {
    console.log("\n--- Migrating Config ---");

    const snapshot = await firestore
        .collection(`artifacts/${APP_ID}/public/data/config`)
        .get();

    const records = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();

        records.push({
            id: generateUUID(),
            key: doc.id,
            value: data,
            updated_at: convertTimestamp(data.updatedAt) || new Date()
        });
    }

    if (records.length > 0) {
        await db("config").insert(records);
    }

    console.log(`  Migrated ${records.length} config entries`);
}

// ===== MAIN =====

async function migrate() {
    console.log("=".repeat(50));
    console.log("Firestore to PostgreSQL Migration");
    console.log("=".repeat(50));

    try {
        // Initialize connections
        await initFirebase();
        initDatabase();

        // Clear existing data (optional - comment out if you want to keep existing data)
        console.log("\n--- Clearing existing data ---");
        await db("checklists").del();
        await db("release_notes").del();
        await db("deployments").del();
        await db("products").del();
        await db("clients").del();
        await db("config").del();
        console.log("  Existing data cleared");

        // Run migrations in order (respecting foreign key dependencies)
        const clientIdMap = await migrateClients();
        const productIdMap = await migrateProducts();
        const deploymentIdMap = await migrateDeployments(clientIdMap, productIdMap);
        await migrateChecklists(deploymentIdMap);
        await migrateReleaseNotes(productIdMap);
        await migrateConfig();

        console.log("\n" + "=".repeat(50));
        console.log("Migration completed successfully!");
        console.log("=".repeat(50));

    } catch (error) {
        console.error("\nMigration failed:", error);
        throw error;
    } finally {
        if (db) {
            await db.destroy();
        }
    }
}

// Run migration
migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
