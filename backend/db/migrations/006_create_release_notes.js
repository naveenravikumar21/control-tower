/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable("release_notes", table => {
        table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
        table.uuid("product_id").references("id").inTable("products").onDelete("CASCADE").notNullable();
        table.string("version", 50).notNullable();
        table.date("release_date");
        table.string("title", 255);
        table.text("summary");

        // Items array: { id, type, title, description, visibility }
        table.jsonb("items").defaultTo("[]");

        // History array: { id, timestamp, author, action, changes }
        table.jsonb("history").defaultTo("[]");

        table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
        table.timestamp("updated_at", { useTz: true }).defaultTo(knex.fn.now());

        table.index("product_id");
        table.index("version");
    }).then(() => {
        return knex.raw(`
            CREATE INDEX idx_release_notes_release_date ON release_notes(release_date DESC);
        `);
    }).then(() => {
        return knex.raw(`
            CREATE TRIGGER update_release_notes_updated_at
            BEFORE UPDATE ON release_notes
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
    return knex.raw("DROP TRIGGER IF EXISTS update_release_notes_updated_at ON release_notes")
        .then(() => knex.schema.dropTableIfExists("release_notes"));
};
