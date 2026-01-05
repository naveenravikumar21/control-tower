#!/usr/bin/env node

/**
 * Import JSON Backup to PostgreSQL
 *
 * Imports data from firebase-backup.json into PostgreSQL.
 *
 * Usage:
 *   cd backend
 *   node scripts/import-json-to-postgres.js
 */

require("dotenv").config();

const knex = require("knex");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

// Path to JSON backup
const BACKUP_PATH = path.join(__dirname, "..", "exports", "firebase-backup.json");

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || "postgres://db1usr:db1pwd@linemeup.in/control_tower";

let db;

function initDatabase() {
    db = knex({
        client: "pg",
        connection: DATABASE_URL,
        pool: { min: 2, max: 10 }
    });
    console.log("Database connection initialized");
}

function convertTimestamp(value) {
    if (!value) return null;
    if (typeof value === "string") {
        return new Date(value);
    }
    if (value.seconds) {
        return new Date(value.seconds * 1000);
    }
    return new Date(value);
}

function generateUUID() {
    return uuidv4();
}

async function migrateClients(clients) {
    console.log("\n--- Migrating Clients ---");

    const idMap = new Map();
    const records = [];

    for (const data of clients) {
        const newId = generateUUID();
        idMap.set(data.id, newId);

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

async function migrateProducts(products) {
    console.log("\n--- Migrating Products ---");

    const idMap = new Map();
    const records = [];

    // First pass: Create ID mappings and prepare records
    for (const data of products) {
        const newId = generateUUID();
        idMap.set(data.id, newId);

        // Parse documentation from flattened format
        const documentation = {};
        if (data["documentation.productGuide"]) documentation.productGuide = data["documentation.productGuide"];
        if (data["documentation.releaseNotes"]) documentation.releaseNotes = data["documentation.releaseNotes"];
        if (data["documentation.demoScript"]) documentation.demoScript = data["documentation.demoScript"];
        if (data["documentation.testCases"]) documentation.testCases = data["documentation.testCases"];
        if (data["documentation.productionChecklist"]) documentation.productionChecklist = data["documentation.productionChecklist"];

        // Parse relevantDocs from flattened format
        const relevantDocs = {};
        Object.keys(data).filter(k => k.startsWith('relevantDocs.')).forEach(k => {
            const key = k.replace('relevantDocs.', '');
            relevantDocs[key] = data[k];
        });

        // Parse EAP if it exists (can be empty string or object)
        let eap = null;
        if (data["eap.enabled"] !== undefined) {
            eap = {
                enabled: data["eap.enabled"],
                clients: data["eap.clients"] ? JSON.parse(data["eap.clients"]) : []
            };
        } else if (data.eap && data.eap !== "") {
            try {
                eap = typeof data.eap === "string" ? JSON.parse(data.eap) : data.eap;
            } catch (e) {
                eap = null;
            }
        }

        // Parse notes if it's a string
        let notes = [];
        if (data.notes) {
            try {
                notes = typeof data.notes === "string" ? JSON.parse(data.notes) : data.notes;
            } catch (e) {
                notes = [];
            }
        }

        // Parse notificationEmails if it's a string
        let notificationEmails = [];
        if (data.notificationEmails) {
            try {
                notificationEmails = typeof data.notificationEmails === "string"
                    ? JSON.parse(data.notificationEmails)
                    : data.notificationEmails;
            } catch (e) {
                notificationEmails = [];
            }
        }

        records.push({
            _oldParentId: data.parentId,
            id: newId,
            name: data.name || "",
            description: data.description || null,
            product_owner: data.productOwner || null,
            engineering_owner: data.engineeringOwner || null,
            next_release_date: data.nextReleaseDate || null,
            parent_id: null,
            documentation: JSON.stringify(documentation),
            relevant_docs: JSON.stringify(relevantDocs),
            eap: eap ? JSON.stringify(eap) : null,
            is_adapter: data.isAdapter || false,
            has_equipment_sa: data.hasEquipmentSA || false,
            has_equipment_se: data.hasEquipmentSE || false,
            has_mapping_service: data.hasMappingService || false,
            has_construction_service: data.hasConstructionService || false,
            notification_emails: JSON.stringify(notificationEmails),
            notes: JSON.stringify(notes),
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

async function migrateDeployments(deployments, clientIdMap, productIdMap) {
    console.log("\n--- Migrating Deployments ---");

    const idMap = new Map();
    const records = [];

    for (const data of deployments) {
        const newId = generateUUID();
        idMap.set(data.id, newId);

        // Map client and product IDs
        const clientId = data.clientId ? clientIdMap.get(data.clientId) : null;
        const productId = productIdMap.get(data.productId);

        if (!productId) {
            console.warn(`  Warning: Deployment ${data.id} has invalid productId ${data.productId}, skipping`);
            continue;
        }

        // Parse notes if it's a string
        let notes = [];
        if (data.notes) {
            try {
                notes = typeof data.notes === "string" ? JSON.parse(data.notes) : data.notes;
            } catch (e) {
                notes = [];
            }
        }

        // Parse blockedComments if it's a string
        let blockedComments = [];
        if (data.blockedComments) {
            try {
                blockedComments = typeof data.blockedComments === "string"
                    ? JSON.parse(data.blockedComments)
                    : data.blockedComments;
            } catch (e) {
                blockedComments = [];
            }
        }

        // Parse statusHistory if it's a string
        let statusHistory = [];
        if (data.statusHistory) {
            try {
                statusHistory = typeof data.statusHistory === "string"
                    ? JSON.parse(data.statusHistory)
                    : data.statusHistory;
            } catch (e) {
                statusHistory = [];
            }
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
            notes: JSON.stringify(notes),
            blocked_comments: JSON.stringify(blockedComments),
            status_history: JSON.stringify(statusHistory),
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

async function migrateChecklists(checklists, deploymentIdMap) {
    console.log("\n--- Migrating Checklists ---");

    const records = [];

    for (const data of checklists) {
        const deploymentId = deploymentIdMap.get(data.deploymentId);

        if (!deploymentId) {
            console.warn(`  Warning: Checklist ${data.id} has invalid deploymentId ${data.deploymentId}, skipping`);
            continue;
        }

        records.push({
            id: generateUUID(),
            deployment_id: deploymentId,
            item: data.item || data.title || "",
            is_completed: data.isCompleted || data.completed || false,
            order: data.order || 0,
            created_at: convertTimestamp(data.createdAt) || new Date(),
            updated_at: convertTimestamp(data.updatedAt) || new Date()
        });
    }

    if (records.length > 0) {
        // Insert in batches to avoid issues with large datasets
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            await db("checklists").insert(batch);
        }
    }

    console.log(`  Migrated ${records.length} checklist items`);
}

async function migrateReleaseNotes(releaseNotes, productIdMap) {
    console.log("\n--- Migrating Release Notes ---");

    const records = [];

    for (const data of releaseNotes) {
        const productId = productIdMap.get(data.productId);

        if (!productId) {
            console.warn(`  Warning: Release note ${data.id} has invalid productId ${data.productId}, skipping`);
            continue;
        }

        // Parse items if it's a string
        let items = [];
        if (data.items) {
            try {
                items = typeof data.items === "string" ? JSON.parse(data.items) : data.items;
            } catch (e) {
                items = [];
            }
        }

        // Parse history if it's a string
        let history = [];
        if (data.history) {
            try {
                history = typeof data.history === "string" ? JSON.parse(data.history) : data.history;
            } catch (e) {
                history = [];
            }
        }

        records.push({
            id: generateUUID(),
            product_id: productId,
            version: data.version || "",
            release_date: data.releaseDate || null,
            title: data.title || null,
            summary: data.summary || null,
            items: JSON.stringify(items),
            history: JSON.stringify(history),
            created_at: convertTimestamp(data.createdAt) || new Date(),
            updated_at: convertTimestamp(data.updatedAt) || new Date()
        });
    }

    if (records.length > 0) {
        await db("release_notes").insert(records);
    }

    console.log(`  Migrated ${records.length} release notes`);
}

async function migrateConfig(config) {
    console.log("\n--- Migrating Config ---");

    const records = [];

    for (const data of config) {
        records.push({
            id: generateUUID(),
            key: data.id || data.key,
            value: JSON.stringify(data),
            updated_at: convertTimestamp(data.updatedAt) || new Date()
        });
    }

    if (records.length > 0) {
        await db("config").insert(records);
    }

    console.log(`  Migrated ${records.length} config entries`);
}

async function migrate() {
    console.log("=".repeat(50));
    console.log("JSON Backup to PostgreSQL Migration");
    console.log("=".repeat(50));

    // Check if backup file exists
    if (!fs.existsSync(BACKUP_PATH)) {
        console.error(`ERROR: Backup file not found at ${BACKUP_PATH}`);
        console.error("Run the export script first: node scripts/export-firebase-to-csv.js");
        process.exit(1);
    }

    // Load backup data
    console.log(`\nLoading backup from: ${BACKUP_PATH}`);
    const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, "utf-8"));
    console.log(`Backup created at: ${backup.exportedAt}`);

    try {
        initDatabase();

        // Clear existing data
        console.log("\n--- Clearing existing data ---");
        await db("checklists").del();
        await db("release_notes").del();
        await db("deployments").del();
        await db("products").del();
        await db("clients").del();
        await db("config").del();
        console.log("  Existing data cleared");

        // Run migrations in order (respecting foreign key dependencies)
        const clients = backup.collections.clients || [];
        const products = backup.collections.products || [];
        const deployments = backup.collections.deployments || [];
        const checklists = backup.collections.checklists || [];
        const releaseNotes = backup.collections.releaseNotes || [];
        const config = backup.collections.config || [];

        const clientIdMap = await migrateClients(clients);
        const productIdMap = await migrateProducts(products);
        const deploymentIdMap = await migrateDeployments(deployments, clientIdMap, productIdMap);
        await migrateChecklists(checklists, deploymentIdMap);
        await migrateReleaseNotes(releaseNotes, productIdMap);
        await migrateConfig(config);

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
