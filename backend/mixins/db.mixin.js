"use strict";

const knex = require("knex");

let dbConnection = null;

function getConnection() {
    if (!dbConnection) {
        dbConnection = knex({
            client: "pg",
            connection: process.env.DATABASE_URL || "postgres://db1usr:db1pwd@linemeup.in/control_tower",
            pool: { min: 2, max: 10 }
        });
    }
    return dbConnection;
}

module.exports = {
    settings: {
        table: null // Must be set by service
    },

    created() {
        // Expose db as a property for convenience
        this.db = getConnection();
    },

    methods: {
        /**
         * Get the database connection
         */
        getDb() {
            return getConnection();
        },

        /**
         * Get query builder for the service's table
         */
        query() {
            return this.getDb()(this.settings.table);
        },

        /**
         * Find a record by ID
         */
        async findById(id) {
            const result = await this.query().where({ id }).first();
            return this.transformFromDb ? this.transformFromDb(result) : result;
        },

        /**
         * Find one record matching query
         */
        async findOne(query) {
            return await this.query().where(query).first();
        },

        /**
         * Find all records matching query
         */
        async find(query = {}) {
            return await this.query().where(query);
        },

        /**
         * Insert a new record
         */
        async insert(data) {
            const [result] = await this.query().insert(data).returning("*");
            return this.transformFromDb ? this.transformFromDb(result) : result;
        },

        /**
         * Update a record by ID
         */
        async updateById(id, data) {
            const [result] = await this.query().where({ id }).update(data).returning("*");
            return this.transformFromDb ? this.transformFromDb(result) : result;
        },

        /**
         * Delete a record by ID
         */
        async removeById(id) {
            return await this.query().where({ id }).del();
        },

        /**
         * Transform camelCase keys to snake_case
         */
        camelToSnake(obj) {
            if (!obj || typeof obj !== "object") return obj;
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                result[snakeKey] = value;
            }
            return result;
        },

        /**
         * Transform snake_case keys to camelCase
         */
        snakeToCamel(obj) {
            if (!obj || typeof obj !== "object") return obj;
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                result[camelKey] = value;
            }
            return result;
        }
    },

    async stopped() {
        if (dbConnection) {
            await dbConnection.destroy();
            dbConnection = null;
        }
    }
};
