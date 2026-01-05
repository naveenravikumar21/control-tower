/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable("deployments", table => {
        table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
        table.uuid("client_id").references("id").inTable("clients").onDelete("SET NULL");
        table.uuid("product_id").references("id").inTable("products").onDelete("CASCADE").notNullable();

        // Status: 'Not Started', 'In Progress', 'Blocked', 'Released'
        table.string("status", 50).defaultTo("Not Started");

        // Deployment type: 'ga', 'eap', 'feature-release', 'client-specific'
        table.string("deployment_type", 50).defaultTo("feature-release");

        // Environment: 'qa', 'sandbox', 'production'
        table.string("environment", 50).defaultTo("production");

        table.date("next_delivery_date");
        table.string("feature_name", 255);
        table.text("release_items");

        // Notes, comments, and history (JSON arrays)
        table.jsonb("notes").defaultTo("[]");
        table.jsonb("blocked_comments").defaultTo("[]");
        table.jsonb("status_history").defaultTo("[]");

        // Adapter service statuses: 'not_started', 'in_progress', 'completed', 'na'
        table.string("equipment_sa_status", 50);
        table.string("equipment_se_status", 50);
        table.string("mapping_status", 50);
        table.string("construction_status", 50);

        table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
        table.timestamp("updated_at", { useTz: true }).defaultTo(knex.fn.now());

        table.index("client_id");
        table.index("product_id");
        table.index("status");
        table.index("next_delivery_date");
        table.index("environment");
    }).then(() => {
        return knex.raw(`
            CREATE TRIGGER update_deployments_updated_at
            BEFORE UPDATE ON deployments
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
    return knex.raw("DROP TRIGGER IF EXISTS update_deployments_updated_at ON deployments")
        .then(() => knex.schema.dropTableIfExists("deployments"));
};
