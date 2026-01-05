"use strict";

const ApiGateway = require("moleculer-web");

module.exports = {
    name: "api",
    mixins: [ApiGateway],

    // Wait for these services to be available before starting
    dependencies: [
        "auth",
        "clients",
        "products",
        "deployments",
        "checklists",
        "release-notes",
        "config"
    ],

    actions: {
        // Debug action to test service calls
        "test-clients": {
            async handler(ctx) {
                this.logger.info("Testing clients.list call from API service...");
                try {
                    const result = await ctx.call("clients.list");
                    return { success: true, count: result?.length || 0, data: result };
                } catch (err) {
                    this.logger.error("Error calling clients.list:", err.message);
                    return { success: false, error: err.message };
                }
            }
        },

        // Proxy actions for public read endpoints
        "proxy.clients.list": { handler(ctx) { return ctx.call("clients.list"); } },
        "proxy.clients.get": { params: { id: "string" }, handler(ctx) { return ctx.call("clients.get", ctx.params); } },
        "proxy.products.list": { handler(ctx) { return ctx.call("products.list"); } },
        "proxy.products.get": { params: { id: "string" }, handler(ctx) { return ctx.call("products.get", ctx.params); } },
        "proxy.deployments.list": { handler(ctx) { return ctx.call("deployments.list"); } },
        "proxy.deployments.get": { params: { id: "string" }, handler(ctx) { return ctx.call("deployments.get", ctx.params); } },
        "proxy.checklists.list": { handler(ctx) { return ctx.call("checklists.list"); } },
        "proxy.checklists.get": { params: { id: "string" }, handler(ctx) { return ctx.call("checklists.get", ctx.params); } },
        "proxy.checklists.listByDeployment": { params: { deploymentId: "string" }, handler(ctx) { return ctx.call("checklists.listByDeployment", ctx.params); } },
        "proxy.release-notes.list": { handler(ctx) { return ctx.call("release-notes.list"); } },
        "proxy.release-notes.get": { params: { id: "string" }, handler(ctx) { return ctx.call("release-notes.get", ctx.params); } },
        "proxy.release-notes.listByProduct": { params: { productId: "string" }, handler(ctx) { return ctx.call("release-notes.listByProduct", ctx.params); } },
        "proxy.config.list": { handler(ctx) { return ctx.call("config.list"); } },
        "proxy.config.getByKey": { params: { key: "string" }, handler(ctx) { return ctx.call("config.getByKey", ctx.params); } }
    },

    settings: {
        port: process.env.PORT || 3000,

        ip: "0.0.0.0",

        // Global CORS settings
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
            exposedHeaders: [],
            credentials: false,
            maxAge: 3600
        },

        // Rate limiter
        rateLimit: {
            window: 10 * 1000,
            limit: 100,
            headers: true
        },

        routes: [
            // Debug route
            {
                path: "/api/debug",
                aliases: {
                    "GET /test-clients": "api.test-clients"
                },
                bodyParsers: { json: true }
            },

            // Public auth routes (no auth required)
            {
                path: "/api/auth",
                whitelist: ["**"],
                aliases: {
                    "POST /login": "auth.login",
                    "POST /register": "auth.register",
                    "POST /refresh": "auth.refresh"
                },
                bodyParsers: {
                    json: true
                }
            },

            // Combined API routes - single route handles both public reads and protected writes
            {
                path: "/api",

                // Authorization check (custom logic in authorize method determines if needed)
                authorization: true,

                // Allow calling any service action
                whitelist: ["**"],

                aliases: {
                    // Public read endpoints (no auth check needed for GET)
                    "GET /clients": "api.proxy.clients.list",
                    "GET /clients/:id": "api.proxy.clients.get",
                    "GET /products": "api.proxy.products.list",
                    "GET /products/:id": "api.proxy.products.get",
                    "GET /deployments": "api.proxy.deployments.list",
                    "GET /deployments/:id": "api.proxy.deployments.get",
                    "GET /checklists": "api.proxy.checklists.list",
                    "GET /checklists/:id": "api.proxy.checklists.get",
                    "GET /deployments/:deploymentId/checklists": "api.proxy.checklists.listByDeployment",
                    "GET /release-notes": "api.proxy.release-notes.list",
                    "GET /release-notes/:id": "api.proxy.release-notes.get",
                    "GET /products/:productId/release-notes": "api.proxy.release-notes.listByProduct",
                    "GET /config": "api.proxy.config.list",
                    "GET /config/:key": "api.proxy.config.getByKey",

                    // Protected endpoints (require auth)
                    // Auth
                    "GET /auth/me": "auth.me",

                    // Users (admin)
                    "GET /users": "auth.list",
                    "GET /users/:id": "auth.get",
                    "POST /users": "auth.register",
                    "PUT /users/:id": "auth.update",
                    "DELETE /users/:id": "auth.remove",

                    // Clients (write)
                    "POST /clients": "clients.create",
                    "PUT /clients/:id": "clients.update",
                    "DELETE /clients/:id": "clients.remove",

                    // Products (write)
                    "POST /products": "products.create",
                    "PUT /products/:id": "products.update",
                    "DELETE /products/:id": "products.remove",

                    // Deployments (write)
                    "POST /deployments": "deployments.create",
                    "PUT /deployments/:id": "deployments.update",
                    "DELETE /deployments/:id": "deployments.remove",

                    // Checklists (write)
                    "POST /checklists": "checklists.create",
                    "PUT /checklists/:id": "checklists.update",
                    "PUT /checklists/:id/toggle": "checklists.toggle",
                    "PUT /deployments/:deploymentId/checklists/mark-all": "checklists.markAllComplete",
                    "PUT /deployments/:deploymentId/checklists/reset": "checklists.resetAll",
                    "DELETE /checklists/:id": "checklists.remove",

                    // Release Notes (write)
                    "POST /release-notes": "release-notes.create",
                    "PUT /release-notes/:id": "release-notes.update",
                    "DELETE /release-notes/:id": "release-notes.remove",

                    // Config (write)
                    "PUT /config/:key": "config.setByKey"
                },

                bodyParsers: {
                    json: {
                        strict: false,
                        limit: "1MB"
                    },
                    urlencoded: {
                        extended: true,
                        limit: "1MB"
                    }
                },

                // Mapping params from URL
                mappingPolicy: "all"
            }
        ],

        // Global error handler
        onError(req, res, err) {
            res.setHeader("Content-Type", "application/json");
            res.writeHead(err.code || 500);
            res.end(JSON.stringify({
                success: false,
                message: err.message || "Internal Server Error",
                code: err.code || 500
            }));
        },

        // Assets serving (optional, for static files)
        assets: {
            folder: "public",
            options: {}
        }
    },

    methods: {
        /**
         * Authorize the request
         * Skip auth for public GET endpoints on certain resources
         */
        async authorize(ctx, route, req) {
            const method = req.method;
            const url = req.url;

            // Public endpoints that don't require auth (paths are relative to route)
            const publicPatterns = [
                /^\/clients/,
                /^\/products/,
                /^\/deployments/,
                /^\/checklists/,
                /^\/release-notes/,
                /^\/config/
            ];

            // Skip auth for GET requests to public endpoints
            if (method === "GET") {
                const isPublic = publicPatterns.some(pattern => pattern.test(url));
                if (isPublic) {
                    return null;
                }
            }

            // Otherwise, require authentication
            const auth = req.headers["authorization"];

            if (!auth || !auth.startsWith("Bearer ")) {
                throw new ApiGateway.Errors.UnAuthorizedError("NO_TOKEN", {
                    message: "Authorization header is missing or invalid"
                });
            }

            const token = auth.slice(7);

            try {
                const user = await ctx.call("auth.verify", { token });
                ctx.meta.user = user;
                return user;
            } catch (err) {
                throw new ApiGateway.Errors.UnAuthorizedError("INVALID_TOKEN", {
                    message: err.message || "Invalid token"
                });
            }
        }
    },

    created() {
        this.logger.info("API Gateway service created");
    },

    started() {
        this.logger.info(`API Gateway listening on port ${this.settings.port}`);
    }
};
