"use strict";

const DbMixin = require("../mixins/db.mixin");

module.exports = {
    name: "config",
    mixins: [DbMixin],

    settings: {
        table: "config"
    },

    actions: {
        /**
         * List all config entries
         */
        list: {
            async handler(ctx) {
                const results = await this.query().orderBy("key");
                return results.map(r => this.transformFromDb(r));
            }
        },

        /**
         * Get config by key
         */
        getByKey: {
            params: {
                key: "string"
            },
            async handler(ctx) {
                const result = await this.findOne({ key: ctx.params.key });
                if (!result) {
                    return null;
                }
                return this.transformFromDb(result);
            }
        },

        /**
         * Get a single config by ID
         */
        get: {
            params: {
                id: "uuid"
            },
            async handler(ctx) {
                const result = await this.findById(ctx.params.id);
                if (!result) {
                    throw new Error("Config not found");
                }
                return result;
            }
        },

        /**
         * Set config by key (upsert)
         */
        setByKey: {
            params: {
                key: "string",
                value: "any"
            },
            async handler(ctx) {
                const { key, value } = ctx.params;
                const existing = await this.findOne({ key });

                if (existing) {
                    // Update existing
                    return await this.updateById(existing.id, { value });
                } else {
                    // Create new
                    return await this.insert({ key, value });
                }
            }
        },

        /**
         * Create a new config entry
         */
        create: {
            params: {
                key: "string",
                value: "any"
            },
            async handler(ctx) {
                const existing = await this.findOne({ key: ctx.params.key });
                if (existing) {
                    throw new Error("Config key already exists");
                }

                return await this.insert({
                    key: ctx.params.key,
                    value: ctx.params.value
                });
            }
        },

        /**
         * Update a config entry
         */
        update: {
            params: {
                id: "uuid",
                key: "string|optional",
                value: "any|optional"
            },
            async handler(ctx) {
                const { id, ...updates } = ctx.params;
                const data = {};

                if (updates.key !== undefined) data.key = updates.key;
                if (updates.value !== undefined) data.value = updates.value;

                if (Object.keys(data).length === 0) {
                    return await this.findById(id);
                }

                return await this.updateById(id, data);
            }
        },

        /**
         * Delete a config entry
         */
        remove: {
            params: {
                id: "uuid"
            },
            async handler(ctx) {
                await this.removeById(ctx.params.id);
                return { success: true };
            }
        },

        /**
         * Delete config by key
         */
        removeByKey: {
            params: {
                key: "string"
            },
            async handler(ctx) {
                const result = await this.findOne({ key: ctx.params.key });
                if (result) {
                    await this.removeById(result.id);
                }
                return { success: true };
            }
        }
    },

    methods: {
        transformFromDb(record) {
            if (!record) return null;
            return {
                id: record.id,
                key: record.key,
                value: record.value,
                updatedAt: record.updated_at
            };
        }
    }
};
