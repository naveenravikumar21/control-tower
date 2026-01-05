/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable("deployments", table => {
        // Documentation URLs (key-value map of doc type to URL)
        table.jsonb("documentation").defaultTo("{}");
        // Which doc types are relevant for this deployment
        table.jsonb("relevant_docs").defaultTo("[]");
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable("deployments", table => {
        table.dropColumn("documentation");
        table.dropColumn("relevant_docs");
    });
};
