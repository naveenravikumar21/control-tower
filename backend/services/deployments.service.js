"use strict";

const DbMixin = require("../mixins/db.mixin");

// Standard checklist items (matches frontend constants)
const STANDARD_CHECKLIST = [
    "Requirements Finalized",
    "API Ready",
    "Backend Ready",
    "Frontend Ready",
    "Test Cases Approved",
    "UAT Completed",
    "Release Notes Added",
    "Documentation Uploaded",
    "Go-Live Validation Completed"
];

module.exports = {
    name: "deployments",
    mixins: [DbMixin],

    settings: {
        table: "deployments"
    },

    actions: {
        /**
         * List all deployments with client and product names
         */
        list: {
            async handler(ctx) {
                const results = await this.getDb()("deployments")
                    .select(
                        "deployments.*",
                        "clients.name as client_name",
                        "products.name as product_name"
                    )
                    .leftJoin("clients", "deployments.client_id", "clients.id")
                    .leftJoin("products", "deployments.product_id", "products.id")
                    .orderBy("deployments.next_delivery_date");

                return results.map(r => this.transformFromDb(r));
            }
        },

        /**
         * Get a single deployment by ID
         */
        get: {
            params: {
                id: "uuid"
            },
            async handler(ctx) {
                const results = await this.getDb()("deployments")
                    .select(
                        "deployments.*",
                        "clients.name as client_name",
                        "products.name as product_name"
                    )
                    .leftJoin("clients", "deployments.client_id", "clients.id")
                    .leftJoin("products", "deployments.product_id", "products.id")
                    .where("deployments.id", ctx.params.id)
                    .first();

                if (!results) {
                    throw new Error("Deployment not found");
                }

                return this.transformFromDb(results);
            }
        },

        /**
         * Create a new deployment with auto-created checklist
         */
        create: {
            params: {
                clientId: "uuid|optional|nullable",
                productId: "uuid",
                status: "string|optional",
                deploymentType: "string|optional",
                environment: "string|optional",
                nextDeliveryDate: "string|optional",
                featureName: "string|optional",
                releaseItems: "string|optional",
                notes: "array|optional",
                equipmentSAStatus: "string|optional|nullable",
                equipmentSEStatus: "string|optional|nullable",
                mappingStatus: "string|optional|nullable",
                constructionStatus: "string|optional|nullable",
                documentation: "object|optional",
                relevantDocs: "array|optional",
                deliveryPerson: "string|optional|nullable"
            },
            async handler(ctx) {
                const data = this.transformToDb(ctx.params);

                // Set defaults
                if (!data.status) data.status = "Not Started";
                if (!data.deployment_type) data.deployment_type = "feature-release";
                if (!data.environment) data.environment = "production";
                if (!data.notes) data.notes = [];
                if (!data.blocked_comments) data.blocked_comments = [];
                if (!data.status_history) data.status_history = [];
                if (!data.documentation) data.documentation = JSON.stringify({});
                if (!data.relevant_docs) data.relevant_docs = JSON.stringify([]);

                // Insert deployment
                const [deployment] = await this.getDb()("deployments")
                    .insert(data)
                    .returning("*");

                // Create standard checklist items
                const checklistItems = STANDARD_CHECKLIST.map((item, index) => ({
                    deployment_id: deployment.id,
                    item,
                    is_completed: false,
                    order: index
                }));

                await this.getDb()("checklists").insert(checklistItems);

                return this.transformFromDb(deployment);
            }
        },

        /**
         * Update a deployment
         */
        update: {
            params: {
                id: "uuid",
                clientId: "uuid|optional|nullable",
                productId: "uuid|optional",
                status: "string|optional",
                deploymentType: "string|optional",
                environment: "string|optional",
                nextDeliveryDate: "string|optional|nullable",
                featureName: "string|optional|nullable",
                releaseItems: "string|optional|nullable",
                notes: "array|optional",
                blockedComments: "array|optional",
                statusHistory: "array|optional",
                equipmentSAStatus: "string|optional|nullable",
                equipmentSEStatus: "string|optional|nullable",
                mappingStatus: "string|optional|nullable",
                constructionStatus: "string|optional|nullable",
                documentation: "object|optional",
                relevantDocs: "array|optional",
                deliveryPerson: "string|optional|nullable"
            },
            async handler(ctx) {
                const { id, ...updates } = ctx.params;
                const data = this.transformToDb(updates);

                if (Object.keys(data).length === 0) {
                    return await ctx.call("deployments.get", { id });
                }

                const [result] = await this.getDb()("deployments")
                    .where({ id })
                    .update(data)
                    .returning("*");

                return this.transformFromDb(result);
            }
        },

        /**
         * Delete a deployment (checklists will cascade delete)
         */
        remove: {
            params: {
                id: "uuid"
            },
            async handler(ctx) {
                await this.removeById(ctx.params.id);
                return { success: true };
            }
        }
    },

    methods: {
        transformToDb(data) {
            const result = {};

            if (data.clientId !== undefined) result.client_id = data.clientId || null;
            if (data.productId !== undefined) result.product_id = data.productId;
            if (data.status !== undefined) result.status = data.status;
            if (data.deploymentType !== undefined) result.deployment_type = data.deploymentType;
            if (data.environment !== undefined) result.environment = data.environment;
            if (data.nextDeliveryDate !== undefined) result.next_delivery_date = data.nextDeliveryDate || null;
            if (data.featureName !== undefined) result.feature_name = data.featureName || null;
            if (data.releaseItems !== undefined) result.release_items = data.releaseItems || null;
            if (data.notes !== undefined) result.notes = data.notes;
            if (data.blockedComments !== undefined) result.blocked_comments = data.blockedComments;
            if (data.statusHistory !== undefined) result.status_history = data.statusHistory;
            if (data.equipmentSAStatus !== undefined) result.equipment_sa_status = data.equipmentSAStatus;
            if (data.equipmentSEStatus !== undefined) result.equipment_se_status = data.equipmentSEStatus;
            if (data.mappingStatus !== undefined) result.mapping_status = data.mappingStatus;
            if (data.constructionStatus !== undefined) result.construction_status = data.constructionStatus;
            if (data.documentation !== undefined) {
                const doc = data.documentation || {};
                result.documentation = typeof doc === 'object' ? JSON.stringify(doc) : doc;
            }
            if (data.relevantDocs !== undefined) {
                const docs = data.relevantDocs || [];
                result.relevant_docs = typeof docs === 'object' ? JSON.stringify(docs) : docs;
            }
            if (data.deliveryPerson !== undefined) result.delivery_person = data.deliveryPerson || null;

            return result;
        },

        transformFromDb(record) {
            if (!record) return null;
            return {
                id: record.id,
                clientId: record.client_id,
                clientName: record.client_name || null,
                productId: record.product_id,
                productName: record.product_name || null,
                status: record.status,
                deploymentType: record.deployment_type,
                environment: record.environment,
                nextDeliveryDate: record.next_delivery_date,
                featureName: record.feature_name,
                releaseItems: record.release_items,
                notes: record.notes || [],
                blockedComments: record.blocked_comments || [],
                statusHistory: record.status_history || [],
                equipmentSAStatus: record.equipment_sa_status,
                equipmentSEStatus: record.equipment_se_status,
                mappingStatus: record.mapping_status,
                constructionStatus: record.construction_status,
                documentation: record.documentation || {},
                relevantDocs: record.relevant_docs || [],
                deliveryPerson: record.delivery_person,
                createdAt: record.created_at,
                updatedAt: record.updated_at
            };
        }
    }
};
