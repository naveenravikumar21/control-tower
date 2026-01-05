"use strict";

const jwt = require("jsonwebtoken");
const DbMixin = require("../mixins/db.mixin");

module.exports = {
    name: "auth",
    mixins: [DbMixin],

    settings: {
        table: "users",
        jwtSecret: process.env.JWT_SECRET || "control-tower-jwt-secret",
        jwtExpiry: "24h",
        refreshExpiry: "7d"
    },

    actions: {
        /**
         * Login with email and password
         */
        login: {
            params: {
                email: "email",
                password: "string"
            },
            async handler(ctx) {
                const { email, password } = ctx.params;
                const user = await this.findOne({ email });

                if (!user) {
                    throw new Error("Invalid credentials");
                }

                // Plain password comparison
                if (user.password_hash !== password) {
                    throw new Error("Invalid credentials");
                }

                if (!user.is_active) {
                    throw new Error("Account is disabled");
                }

                // Update last login
                await this.updateById(user.id, { last_login_at: new Date() });

                const token = this.generateToken(user);
                const refreshToken = this.generateRefreshToken(user);

                return {
                    token,
                    refreshToken,
                    user: this.sanitizeUser(user)
                };
            }
        },

        /**
         * Register a new user (admin only)
         */
        register: {
            params: {
                email: "email",
                password: "string",
                name: "string|optional",
                role: "string|optional"
            },
            async handler(ctx) {
                const { email, password, name, role } = ctx.params;

                // Check if email already exists
                const existing = await this.findOne({ email });
                if (existing) {
                    throw new Error("Email already registered");
                }

                // Create user with plain password
                const user = await this.insert({
                    email,
                    password_hash: password, // Store plain password
                    name: name || null,
                    role: role || "user",
                    is_active: true
                });

                const token = this.generateToken(user);

                return {
                    token,
                    user: this.sanitizeUser(user)
                };
            }
        },

        /**
         * List all users (admin only)
         */
        list: {
            async handler(ctx) {
                const users = await this.db(this.settings.table)
                    .select("id", "email", "name", "role", "is_active", "created_at", "updated_at", "last_login_at")
                    .orderBy("created_at", "desc");
                return users;
            }
        },

        /**
         * Get user by ID
         */
        get: {
            params: {
                id: "string"
            },
            async handler(ctx) {
                const user = await this.findById(ctx.params.id);
                if (!user) {
                    throw new Error("User not found");
                }
                return this.sanitizeUser(user);
            }
        },

        /**
         * Update user
         */
        update: {
            params: {
                id: "string",
                email: "email|optional",
                password: "string|optional",
                name: "string|optional",
                role: "string|optional",
                is_active: "boolean|optional"
            },
            async handler(ctx) {
                const { id, email, password, name, role, is_active } = ctx.params;

                const user = await this.findById(id);
                if (!user) {
                    throw new Error("User not found");
                }

                const updates = {};
                if (email !== undefined) updates.email = email;
                if (password !== undefined) updates.password_hash = password;
                if (name !== undefined) updates.name = name;
                if (role !== undefined) updates.role = role;
                if (is_active !== undefined) updates.is_active = is_active;

                if (Object.keys(updates).length > 0) {
                    await this.updateById(id, updates);
                }

                const updated = await this.findById(id);
                return this.sanitizeUser(updated);
            }
        },

        /**
         * Delete user
         */
        remove: {
            params: {
                id: "string"
            },
            async handler(ctx) {
                const user = await this.findById(ctx.params.id);
                if (!user) {
                    throw new Error("User not found");
                }

                await this.removeById(ctx.params.id);
                return { success: true };
            }
        },

        /**
         * Verify a JWT token
         */
        verify: {
            params: {
                token: "string"
            },
            async handler(ctx) {
                try {
                    const decoded = jwt.verify(ctx.params.token, this.settings.jwtSecret);
                    const user = await this.findById(decoded.id);

                    if (!user) {
                        throw new Error("User not found");
                    }

                    if (!user.is_active) {
                        throw new Error("Account is disabled");
                    }

                    return this.sanitizeUser(user);
                } catch (err) {
                    throw new Error("Invalid token");
                }
            }
        },

        /**
         * Refresh JWT token
         */
        refresh: {
            params: {
                refreshToken: "string"
            },
            async handler(ctx) {
                try {
                    const decoded = jwt.verify(ctx.params.refreshToken, this.settings.jwtSecret);

                    if (decoded.type !== "refresh") {
                        throw new Error("Invalid refresh token");
                    }

                    const user = await this.findById(decoded.id);

                    if (!user || !user.is_active) {
                        throw new Error("User not found or inactive");
                    }

                    const token = this.generateToken(user);

                    return { token };
                } catch (err) {
                    throw new Error("Invalid refresh token");
                }
            }
        },

        /**
         * Get current user info
         */
        me: {
            async handler(ctx) {
                if (!ctx.meta.user) {
                    throw new Error("Not authenticated");
                }
                return ctx.meta.user;
            }
        }
    },

    methods: {
        /**
         * Generate JWT token
         */
        generateToken(user) {
            return jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                this.settings.jwtSecret,
                { expiresIn: this.settings.jwtExpiry }
            );
        },

        /**
         * Generate refresh token
         */
        generateRefreshToken(user) {
            return jwt.sign(
                {
                    id: user.id,
                    type: "refresh"
                },
                this.settings.jwtSecret,
                { expiresIn: this.settings.refreshExpiry }
            );
        },

        /**
         * Remove sensitive fields from user object
         */
        sanitizeUser(user) {
            if (!user) return null;
            const { password_hash, ...safeUser } = user;
            return safeUser;
        },

        /**
         * Create super admin if not exists
         */
        async ensureSuperAdmin() {
            const email = process.env.SUPER_ADMIN_EMAIL;
            const password = process.env.SUPER_ADMIN_PASSWORD;

            if (!email || !password) {
                this.logger.warn("SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set in .env");
                return;
            }

            const existing = await this.findOne({ email });
            if (existing) {
                this.logger.info(`Super admin already exists: ${email}`);
                return;
            }

            await this.insert({
                email,
                password_hash: password,
                name: "Super Admin",
                role: "admin",
                is_active: true
            });

            this.logger.info(`Super admin created: ${email}`);
        }
    },

    async started() {
        await this.ensureSuperAdmin();
    }
};
