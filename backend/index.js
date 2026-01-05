"use strict";

require("dotenv").config();

const { ServiceBroker } = require("moleculer");
const config = require("./moleculer.config");

// Create broker
const broker = new ServiceBroker(config);

// Load all services (API gateway LAST so other services are registered first)
broker.loadService("./services/auth.service.js");
broker.loadService("./services/clients.service.js");
broker.loadService("./services/products.service.js");
broker.loadService("./services/deployments.service.js");
broker.loadService("./services/checklists.service.js");
broker.loadService("./services/release-notes.service.js");
broker.loadService("./services/config.service.js");
broker.loadService("./services/api.service.js");

// Start broker
broker.start()
    .then(() => {
        broker.logger.info("All services loaded successfully!");
        broker.logger.info("Available services:", broker.registry.getServiceList({ withActions: false }).map(s => s.name));

        // Debug: List all registered actions
        const actionList = broker.registry.getActionList({ withEndpoints: true });
        broker.logger.info("Registered actions:", actionList.map(a => a.name));

        // Test direct call to verify services work
        return broker.call("clients.list")
            .then(result => broker.logger.info("Direct call to clients.list succeeded:", result?.length || 0, "items"))
            .catch(err => broker.logger.error("Direct call to clients.list FAILED:", err.message));
    })
    .catch(err => {
        broker.logger.error("Failed to start:", err);
        process.exit(1);
    });
