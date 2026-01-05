/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable("products", table => {
        table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
        table.string("name", 255).notNullable();
        table.text("description");
        table.string("product_owner", 255);
        table.string("engineering_owner", 255);
        table.date("next_release_date");
        table.uuid("parent_id").references("id").inTable("products").onDelete("SET NULL");

        // Documentation URLs (JSON object)
        table.jsonb("documentation").defaultTo("{}");

        // Which documentation types are relevant for this product
        table.jsonb("relevant_docs").defaultTo("{}");

        // EAP (Early Access Program) settings
        // Structure: { isActive: boolean, startDate: string, endDate: string, jiraBoardUrl: string, clientIds: string[] }
        table.jsonb("eap");

        // Adapter type flags
        table.boolean("is_adapter").defaultTo(false);
        table.boolean("has_equipment_sa").defaultTo(false);
        table.boolean("has_equipment_se").defaultTo(false);
        table.boolean("has_mapping_service").defaultTo(false);
        table.boolean("has_construction_service").defaultTo(false);

        // Notification emails (array)
        table.jsonb("notification_emails").defaultTo("[]");

        // Notes (array of objects)
        table.jsonb("notes").defaultTo("[]");

        table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
        table.timestamp("updated_at", { useTz: true }).defaultTo(knex.fn.now());

        table.index("name");
        table.index("parent_id");
        table.index("next_release_date");
    }).then(() => {
        return knex.raw(`
            CREATE INDEX idx_products_is_adapter ON products(is_adapter) WHERE is_adapter = true;
        `);
    }).then(() => {
        return knex.raw(`
            CREATE TRIGGER update_products_updated_at
            BEFORE UPDATE ON products
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
    return knex.raw("DROP TRIGGER IF EXISTS update_products_updated_at ON products")
        .then(() => knex.schema.dropTableIfExists("products"));
};
