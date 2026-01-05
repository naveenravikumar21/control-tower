require("dotenv").config({ path: "../.env" });

module.exports = {
    development: {
        client: "pg",
        connection: process.env.DATABASE_URL || "postgres://db1usr:db1pwd@linemeup.in/control_tower",
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            tableName: "knex_migrations",
            directory: "./migrations"
        },
        seeds: {
            directory: "./seeds"
        }
    },

    production: {
        client: "pg",
        connection: process.env.DATABASE_URL,
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            tableName: "knex_migrations",
            directory: "./migrations"
        }
    }
};
