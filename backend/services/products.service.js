"use strict";

const DbMixin = require("../mixins/db.mixin");

module.exports = {
    name: "products",
    mixins: [DbMixin],

    settings: {
        table: "products"
    },

    actions: {
        /**
         * List all products
         */
        list: {
            async handler(ctx) {
                const results = await this.query().orderBy("name");
                return results.map(r => this.transformFromDb(r));
            }
        },

        /**
         * Get a single product by ID
         */
        get: {
            params: {
                id: "uuid"
            },
            async handler(ctx) {
                const result = await this.findById(ctx.params.id);
                if (!result) {
                    throw new Error("Product not found");
                }
                return result;
            }
        },

        /**
         * Create a new product
         */
        create: {
            params: {
                name: "string",
                description: "string|optional",
                productOwner: "string|optional",
                engineeringOwner: "string|optional",
                nextReleaseDate: "string|optional",
                parentId: "uuid|optional|nullable",
                documentation: "object|optional",
                relevantDocs: "object|optional",
                eap: "object|optional|nullable",
                isAdapter: "boolean|optional",
                hasEquipmentSA: "boolean|optional",
                hasEquipmentSE: "boolean|optional",
                hasMappingService: "boolean|optional",
                hasConstructionService: "boolean|optional",
                notificationEmails: "array|optional",
                notes: "array|optional"
            },
            async handler(ctx) {
                const data = this.transformToDb(ctx.params);
                return await this.insert(data);
            }
        },

        /**
         * Update a product
         */
        update: {
            params: {
                id: "uuid",
                name: "string|optional",
                description: "string|optional|nullable",
                productOwner: "string|optional|nullable",
                engineeringOwner: "string|optional|nullable",
                nextReleaseDate: "string|optional|nullable",
                parentId: "uuid|optional|nullable",
                documentation: "object|optional",
                relevantDocs: "object|optional",
                eap: "object|optional|nullable",
                isAdapter: "boolean|optional",
                hasEquipmentSA: "boolean|optional",
                hasEquipmentSE: "boolean|optional",
                hasMappingService: "boolean|optional",
                hasConstructionService: "boolean|optional",
                notificationEmails: "array|optional",
                notes: "array|optional"
            },
            async handler(ctx) {
                const { id, ...updates } = ctx.params;
                const data = this.transformToDb(updates);

                if (Object.keys(data).length === 0) {
                    return await this.findById(id);
                }

                return await this.updateById(id, data);
            }
        },

        /**
         * Delete a product
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

            if (data.name !== undefined) result.name = data.name;
            if (data.description !== undefined) result.description = data.description;
            if (data.productOwner !== undefined) result.product_owner = data.productOwner;
            if (data.engineeringOwner !== undefined) result.engineering_owner = data.engineeringOwner;
            if (data.nextReleaseDate !== undefined) result.next_release_date = data.nextReleaseDate || null;
            if (data.parentId !== undefined) result.parent_id = data.parentId || null;
            if (data.documentation !== undefined) result.documentation = data.documentation;
            if (data.relevantDocs !== undefined) result.relevant_docs = data.relevantDocs;
            if (data.eap !== undefined) result.eap = data.eap;
            if (data.isAdapter !== undefined) result.is_adapter = data.isAdapter;
            if (data.hasEquipmentSA !== undefined) result.has_equipment_sa = data.hasEquipmentSA;
            if (data.hasEquipmentSE !== undefined) result.has_equipment_se = data.hasEquipmentSE;
            if (data.hasMappingService !== undefined) result.has_mapping_service = data.hasMappingService;
            if (data.hasConstructionService !== undefined) result.has_construction_service = data.hasConstructionService;
            if (data.notificationEmails !== undefined) result.notification_emails = data.notificationEmails;
            if (data.notes !== undefined) result.notes = data.notes;

            return result;
        },

        transformFromDb(record) {
            if (!record) return null;
            return {
                id: record.id,
                name: record.name,
                description: record.description,
                productOwner: record.product_owner,
                engineeringOwner: record.engineering_owner,
                nextReleaseDate: record.next_release_date,
                parentId: record.parent_id,
                documentation: record.documentation || {},
                relevantDocs: record.relevant_docs || {},
                eap: record.eap,
                isAdapter: record.is_adapter,
                hasEquipmentSA: record.has_equipment_sa,
                hasEquipmentSE: record.has_equipment_se,
                hasMappingService: record.has_mapping_service,
                hasConstructionService: record.has_construction_service,
                notificationEmails: record.notification_emails || [],
                notes: record.notes || [],
                createdAt: record.created_at,
                updatedAt: record.updated_at
            };
        }
    }
};
