/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable("checklists", table => {
        table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
        table.uuid("deployment_id").references("id").inTable("deployments").onDelete("CASCADE").notNullable();
        table.string("item", 255).notNullable();
        table.boolean("is_completed").defaultTo(false);
        table.integer("order").defaultTo(0);
        table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
        table.timestamp("updated_at", { useTz: true }).defaultTo(knex.fn.now());

        table.index("deployment_id");
    }).then(() => {
        return knex.raw(`
            CREATE TRIGGER update_checklists_updated_at
            BEFORE UPDATE ON checklists
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.raw("DROP TRIGGER IF EXISTS update_checklists_updated_at ON checklists")
        .then(() => knex.schema.dropTableIfExists("checklists"));
};
