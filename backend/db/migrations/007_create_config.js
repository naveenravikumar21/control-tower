/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable("config", table => {
        table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
        table.string("key", 100).unique().notNullable();
        table.jsonb("value").notNullable();
        table.timestamp("updated_at", { useTz: true }).defaultTo(knex.fn.now());
    }).then(() => {
        return knex.raw(`
            CREATE TRIGGER update_config_updated_at
            BEFORE UPDATE ON config
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
    return knex.raw("DROP TRIGGER IF EXISTS update_config_updated_at ON config")
        .then(() => knex.schema.dropTableIfExists("config"));
};
