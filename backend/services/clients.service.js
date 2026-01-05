"use strict";

const DbMixin = require("../mixins/db.mixin");

module.exports = {
    name: "clients",
    mixins: [DbMixin],

    settings: {
        table: "clients"
    },

    actions: {
        /**
         * List all clients
         */
        list: {
            async handler(ctx) {
                const results = await this.query().orderBy("name");
                return results.map(r => this.transformFromDb(r));
            }
        },

        /**
         * Get a single client by ID
         */
        get: {
            params: {
                id: "uuid"
            },
            async handler(ctx) {
                const result = await this.findById(ctx.params.id);
                if (!result) {
                    throw new Error("Client not found");
                }
                return result;
            }
        },

        /**
         * Create a new client
         */
        create: {
            params: {
                name: "string",
                comments: "string|optional"
            },
            async handler(ctx) {
                const data = {
                    name: ctx.params.name,
                    comments: ctx.params.comments || null
                };
                return await this.insert(data);
            }
        },

        /**
         * Update a client
         */
        update: {
            params: {
                id: "uuid",
                name: "string|optional",
                comments: "string|optional|nullable"
            },
            async handler(ctx) {
                const { id, ...updates } = ctx.params;
                const data = {};

                if (updates.name !== undefined) data.name = updates.name;
                if (updates.comments !== undefined) data.comments = updates.comments;

                if (Object.keys(data).length === 0) {
                    return await this.findById(id);
                }

                return await this.updateById(id, data);
            }
        },

        /**
         * Delete a client
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
        transformFromDb(record) {
            if (!record) return null;
            return {
                id: record.id,
                name: record.name,
                comments: record.comments,
                createdAt: record.created_at,
                updatedAt: record.updated_at
            };
        }
    }
};
