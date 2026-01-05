"use strict";

const DbMixin = require("../mixins/db.mixin");

module.exports = {
    name: "checklists",
    mixins: [DbMixin],

    settings: {
        table: "checklists"
    },

    actions: {
        /**
         * List all checklists
         */
        list: {
            async handler(ctx) {
                const results = await this.query().orderBy("order");
                return results.map(r => this.transformFromDb(r));
            }
        },

        /**
         * List checklists for a specific deployment
         */
        listByDeployment: {
            params: {
                deploymentId: "uuid"
            },
            async handler(ctx) {
                const results = await this.query()
                    .where({ deployment_id: ctx.params.deploymentId })
                    .orderBy("order");
                return results.map(r => this.transformFromDb(r));
            }
        },

        /**
         * Get a single checklist item by ID
         */
        get: {
            params: {
                id: "uuid"
            },
            async handler(ctx) {
                const result = await this.findById(ctx.params.id);
                if (!result) {
                    throw new Error("Checklist item not found");
                }
                return result;
            }
        },

        /**
         * Create a new checklist item
         */
        create: {
            params: {
                deploymentId: "uuid",
                item: "string",
                isCompleted: "boolean|optional",
                order: "number|optional"
            },
            async handler(ctx) {
                const data = {
                    deployment_id: ctx.params.deploymentId,
                    item: ctx.params.item,
                    is_completed: ctx.params.isCompleted || false,
                    order: ctx.params.order || 0
                };
                return await this.insert(data);
            }
        },

        /**
         * Create multiple checklist items
         */
        createMany: {
            params: {
                items: "array"
            },
            async handler(ctx) {
                if (ctx.params.items.length === 0) return [];

                const results = await this.getDb()("checklists")
                    .insert(ctx.params.items)
                    .returning("*");

                return results.map(r => this.transformFromDb(r));
            }
        },

        /**
         * Update a checklist item
         */
        update: {
            params: {
                id: "uuid",
                item: "string|optional",
                isCompleted: "boolean|optional",
                order: "number|optional"
            },
            async handler(ctx) {
                const { id, ...updates } = ctx.params;
                const data = {};

                if (updates.item !== undefined) data.item = updates.item;
                if (updates.isCompleted !== undefined) data.is_completed = updates.isCompleted;
                if (updates.order !== undefined) data.order = updates.order;

                if (Object.keys(data).length === 0) {
                    return await this.findById(id);
                }

                return await this.updateById(id, data);
            }
        },

        /**
         * Toggle checklist item completion
         */
        toggle: {
            params: {
                id: "uuid"
            },
            async handler(ctx) {
                const item = await this.findOne({ id: ctx.params.id });
                if (!item) {
                    throw new Error("Checklist item not found");
                }

                return await this.updateById(ctx.params.id, {
                    is_completed: !item.is_completed
                });
            }
        },

        /**
         * Mark all items in a deployment as complete
         */
        markAllComplete: {
            params: {
                deploymentId: "uuid"
            },
            async handler(ctx) {
                await this.getDb()("checklists")
                    .where({ deployment_id: ctx.params.deploymentId })
                    .update({ is_completed: true });

                return await ctx.call("checklists.listByDeployment", {
                    deploymentId: ctx.params.deploymentId
                });
            }
        },

        /**
         * Reset all items in a deployment
         */
        resetAll: {
            params: {
                deploymentId: "uuid"
            },
            async handler(ctx) {
                await this.getDb()("checklists")
                    .where({ deployment_id: ctx.params.deploymentId })
                    .update({ is_completed: false });

                return await ctx.call("checklists.listByDeployment", {
                    deploymentId: ctx.params.deploymentId
                });
            }
        },

        /**
         * Delete a checklist item
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
                deploymentId: record.deployment_id,
                item: record.item,
                isCompleted: record.is_completed,
                order: record.order,
                createdAt: record.created_at,
                updatedAt: record.updated_at
            };
        }
    }
};
