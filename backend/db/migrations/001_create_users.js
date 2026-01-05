/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
        .then(() => {
            return knex.schema.createTable("users", table => {
                table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
                table.string("email", 255).unique().notNullable();
                table.string("password_hash", 255).notNullable();
                table.string("name", 255);
                table.string("role", 50).defaultTo("user");
                table.boolean("is_active").defaultTo(true);
                table.timestamp("last_login_at", { useTz: true });
                table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
                table.timestamp("updated_at", { useTz: true }).defaultTo(knex.fn.now());
            });
        })
        .then(() => {
            return knex.raw(`
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            `);
        })
        .then(() => {
            return knex.raw(`
                CREATE TRIGGER update_users_updated_at
                BEFORE UPDATE ON users
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
    return knex.raw("DROP TRIGGER IF EXISTS update_users_updated_at ON users")
        .then(() => knex.schema.dropTableIfExists("users"));
};
