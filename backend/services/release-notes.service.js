"use strict";

const DbMixin = require("../mixins/db.mixin");

module.exports = {
    name: "release-notes",
    mixins: [DbMixin],

    settings: {
        table: "release_notes"
    },

    actions: {
        /**
         * List all release notes
         */
        list: {
            async handler(ctx) {
                const results = await this.getDb()("release_notes")
                    .select(
                        "release_notes.*",
                        "products.name as product_name"
                    )
                    .leftJoin("products", "release_notes.product_id", "products.id")
                    .orderBy("release_notes.release_date", "desc");

                return results.map(r => this.transformFromDb(r));
            }
        },

        /**
         * List release notes for a specific product
         */
        listByProduct: {
            params: {
                productId: "uuid"
            },
            async handler(ctx) {
                const results = await this.query()
                    .where({ product_id: ctx.params.productId })
                    .orderBy("release_date", "desc");

                return results.map(r => this.transformFromDb(r));
            }
        },

        /**
         * Get a single release note by ID
         */
        get: {
            params: {
                id: "uuid"
            },
            async handler(ctx) {
                const results = await this.getDb()("release_notes")
                    .select(
                        "release_notes.*",
                        "products.name as product_name"
                    )
                    .leftJoin("products", "release_notes.product_id", "products.id")
                    .where("release_notes.id", ctx.params.id)
                    .first();

                if (!results) {
                    throw new Error("Release note not found");
                }

                return this.transformFromDb(results);
            }
        },

        /**
         * Create a new release note
         */
        create: {
            params: {
                productId: "uuid",
                version: "string",
                releaseDate: "string|optional",
                title: "string|optional",
                summary: "string|optional",
                items: "array|optional",
                history: "array|optional"
            },
            async handler(ctx) {
                const data = this.transformToDb(ctx.params);
                return await this.insert(data);
            }
        },

        /**
         * Update a release note
         */
        update: {
            params: {
                id: "uuid",
                productId: "uuid|optional",
                version: "string|optional",
                releaseDate: "string|optional|nullable",
                title: "string|optional|nullable",
                summary: "string|optional|nullable",
                items: "array|optional",
                history: "array|optional"
            },
            async handler(ctx) {
                const { id, ...updates } = ctx.params;
                const data = this.transformToDb(updates);

                if (Object.keys(data).length === 0) {
                    return await ctx.call("release-notes.get", { id });
                }

                const [result] = await this.getDb()("release_notes")
                    .where({ id })
                    .update(data)
                    .returning("*");

                return this.transformFromDb(result);
            }
        },

        /**
         * Delete a release note
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

            if (data.productId !== undefined) result.product_id = data.productId;
            if (data.version !== undefined) result.version = data.version;
            if (data.releaseDate !== undefined) result.release_date = data.releaseDate || null;
            if (data.title !== undefined) result.title = data.title || null;
            if (data.summary !== undefined) result.summary = data.summary || null;
            if (data.items !== undefined) result.items = data.items || [];
            if (data.history !== undefined) result.history = data.history || [];

            return result;
        },

        transformFromDb(record) {
            if (!record) return null;
            return {
                id: record.id,
                productId: record.product_id,
                productName: record.product_name || null,
                version: record.version,
                releaseDate: record.release_date,
                title: record.title,
                summary: record.summary,
                items: record.items || [],
                history: record.history || [],
                createdAt: record.created_at,
                updatedAt: record.updated_at
            };
        }
    }
};
