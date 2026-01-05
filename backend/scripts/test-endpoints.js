#!/usr/bin/env node

/**
 * API Endpoint Test Script
 *
 * Tests all REST API endpoints for the Control Tower backend.
 *
 * Usage:
 *   node scripts/test-endpoints.js [--base-url=http://localhost:3000]
 *
 * Environment variables:
 *   API_BASE_URL - Base URL for the API (default: http://localhost:3000)
 *   TEST_EMAIL - Email for test user (default: admin@controltower.com)
 *   TEST_PASSWORD - Password for test user (default: admin123)
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@controltower.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

// ANSI colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
    bold: '\x1b[1m'
};

// Test state
let authToken = null;
let testData = {
    clientId: null,
    productId: null,
    deploymentId: null,
    checklistId: null,
    releaseNoteId: null,
    userId: null
};

// Results tracking
const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
};

/**
 * Make an HTTP request
 */
async function request(method, endpoint, body = null, useAuth = false) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json'
    };

    if (useAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const options = {
        method,
        headers
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        const text = await response.text();
        let data = null;

        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = text;
        }

        return {
            status: response.status,
            ok: response.ok,
            data
        };
    } catch (err) {
        return {
            status: 0,
            ok: false,
            error: err.message
        };
    }
}

/**
 * Run a single test
 */
async function test(name, fn) {
    process.stdout.write(`  ${colors.dim}Testing${colors.reset} ${name}... `);

    try {
        const result = await fn();

        if (result.skip) {
            results.skipped++;
            results.tests.push({ name, status: 'skipped', reason: result.reason });
            console.log(`${colors.yellow}SKIPPED${colors.reset} ${colors.dim}(${result.reason})${colors.reset}`);
            return null;
        }

        if (result.success) {
            results.passed++;
            results.tests.push({ name, status: 'passed' });
            console.log(`${colors.green}PASSED${colors.reset}`);
            return result.data;
        } else {
            results.failed++;
            results.tests.push({ name, status: 'failed', error: result.error });
            console.log(`${colors.red}FAILED${colors.reset} ${colors.dim}(${result.error})${colors.reset}`);
            return null;
        }
    } catch (err) {
        results.failed++;
        results.tests.push({ name, status: 'failed', error: err.message });
        console.log(`${colors.red}FAILED${colors.reset} ${colors.dim}(${err.message})${colors.reset}`);
        return null;
    }
}

/**
 * Test section header
 */
function section(title) {
    console.log(`\n${colors.bold}${colors.cyan}== ${title} ==${colors.reset}\n`);
}

// ===== TEST FUNCTIONS =====

async function testServerConnection() {
    const res = await request('GET', '/clients');
    return {
        success: res.status !== 0,
        error: res.error || `Status: ${res.status}`,
        data: res.data
    };
}

async function testLogin() {
    const res = await request('POST', '/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    });

    if (res.ok && res.data?.token) {
        authToken = res.data.token;
        return { success: true, data: res.data };
    }

    return {
        success: false,
        error: res.data?.message || `Status: ${res.status}`
    };
}

async function testAuthMe() {
    if (!authToken) {
        return { skip: true, reason: 'No auth token' };
    }

    const res = await request('GET', '/auth/me', null, true);
    return {
        success: res.ok,
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testListClients() {
    const res = await request('GET', '/clients');
    return {
        success: res.ok && Array.isArray(res.data),
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testCreateClient() {
    if (!authToken) {
        return { skip: true, reason: 'No auth token' };
    }

    const res = await request('POST', '/clients', {
        name: `Test Client ${Date.now()}`,
        comments: 'Created by test script'
    }, true);

    if (res.ok && res.data?.id) {
        testData.clientId = res.data.id;
        return { success: true, data: res.data };
    }

    return {
        success: false,
        error: res.data?.message || `Status: ${res.status}`
    };
}

async function testGetClient() {
    if (!testData.clientId) {
        return { skip: true, reason: 'No client created' };
    }

    const res = await request('GET', `/clients/${testData.clientId}`);
    return {
        success: res.ok && res.data?.id === testData.clientId,
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testUpdateClient() {
    if (!authToken || !testData.clientId) {
        return { skip: true, reason: 'No auth token or client' };
    }

    const res = await request('PUT', `/clients/${testData.clientId}`, {
        name: `Updated Client ${Date.now()}`,
        comments: 'Updated by test script'
    }, true);

    return {
        success: res.ok,
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testListProducts() {
    const res = await request('GET', '/products');
    return {
        success: res.ok && Array.isArray(res.data),
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testCreateProduct() {
    if (!authToken) {
        return { skip: true, reason: 'No auth token' };
    }

    const res = await request('POST', '/products', {
        name: `Test Product ${Date.now()}`,
        description: 'Created by test script',
        productOwner: 'Test Owner',
        engineeringOwner: 'Test Engineer'
    }, true);

    if (res.ok && res.data?.id) {
        testData.productId = res.data.id;
        return { success: true, data: res.data };
    }

    return {
        success: false,
        error: res.data?.message || `Status: ${res.status}`
    };
}

async function testGetProduct() {
    if (!testData.productId) {
        return { skip: true, reason: 'No product created' };
    }

    const res = await request('GET', `/products/${testData.productId}`);
    return {
        success: res.ok && res.data?.id === testData.productId,
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testUpdateProduct() {
    if (!authToken || !testData.productId) {
        return { skip: true, reason: 'No auth token or product' };
    }

    const res = await request('PUT', `/products/${testData.productId}`, {
        name: `Updated Product ${Date.now()}`,
        description: 'Updated by test script'
    }, true);

    return {
        success: res.ok,
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testListDeployments() {
    const res = await request('GET', '/deployments');
    return {
        success: res.ok && Array.isArray(res.data),
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testCreateDeployment() {
    if (!authToken || !testData.clientId || !testData.productId) {
        return { skip: true, reason: 'No auth token, client, or product' };
    }

    const res = await request('POST', '/deployments', {
        clientId: testData.clientId,
        productId: testData.productId,
        status: 'Not Started',
        deploymentType: 'generic',
        notes: []  // notes must be an array
    }, true);

    if (res.ok && res.data?.id) {
        testData.deploymentId = res.data.id;
        return { success: true, data: res.data };
    }

    return {
        success: false,
        error: res.data?.message || `Status: ${res.status}`
    };
}

async function testGetDeployment() {
    if (!testData.deploymentId) {
        return { skip: true, reason: 'No deployment created' };
    }

    const res = await request('GET', `/deployments/${testData.deploymentId}`);
    return {
        success: res.ok && res.data?.id === testData.deploymentId,
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testUpdateDeployment() {
    if (!authToken || !testData.deploymentId) {
        return { skip: true, reason: 'No auth token or deployment' };
    }

    const res = await request('PUT', `/deployments/${testData.deploymentId}`, {
        status: 'In Progress',
        notes: []  // notes must be an array
    }, true);

    return {
        success: res.ok,
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testListChecklists() {
    const res = await request('GET', '/checklists');
    return {
        success: res.ok && Array.isArray(res.data),
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testGetDeploymentChecklists() {
    if (!testData.deploymentId) {
        return { skip: true, reason: 'No deployment created' };
    }

    const res = await request('GET', `/deployments/${testData.deploymentId}/checklists`);
    return {
        success: res.ok && Array.isArray(res.data),
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testCreateChecklist() {
    if (!authToken || !testData.deploymentId) {
        return { skip: true, reason: 'No auth token or deployment' };
    }

    const res = await request('POST', '/checklists', {
        deploymentId: testData.deploymentId,
        item: 'Test checklist item',
        completed: false,
        order: 1
    }, true);

    if (res.ok && res.data?.id) {
        testData.checklistId = res.data.id;
        return { success: true, data: res.data };
    }

    return {
        success: false,
        error: res.data?.message || `Status: ${res.status}`
    };
}

async function testToggleChecklist() {
    if (!authToken || !testData.checklistId) {
        return { skip: true, reason: 'No auth token or checklist' };
    }

    const res = await request('PUT', `/checklists/${testData.checklistId}/toggle`, {}, true);
    return {
        success: res.ok,
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testListReleaseNotes() {
    const res = await request('GET', '/release-notes');
    return {
        success: res.ok && Array.isArray(res.data),
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testGetProductReleaseNotes() {
    if (!testData.productId) {
        return { skip: true, reason: 'No product created' };
    }

    const res = await request('GET', `/products/${testData.productId}/release-notes`);
    return {
        success: res.ok && Array.isArray(res.data),
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testCreateReleaseNote() {
    if (!authToken || !testData.productId) {
        return { skip: true, reason: 'No auth token or product' };
    }

    const res = await request('POST', '/release-notes', {
        productId: testData.productId,
        version: '1.0.0-test',
        releaseDate: new Date().toISOString().split('T')[0],
        notes: 'Test release notes created by test script'
    }, true);

    if (res.ok && res.data?.id) {
        testData.releaseNoteId = res.data.id;
        return { success: true, data: res.data };
    }

    return {
        success: false,
        error: res.data?.message || `Status: ${res.status}`
    };
}

async function testListConfig() {
    const res = await request('GET', '/config');
    return {
        success: res.ok && Array.isArray(res.data),
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testGetConfigByKey() {
    const res = await request('GET', '/config/docTypes');
    // Config may or may not exist, so we accept 200 or 404
    return {
        success: res.ok || res.status === 404,
        error: res.status === 404 ? null : (res.data?.message || `Status: ${res.status}`),
        data: res.data
    };
}

async function testSetConfig() {
    if (!authToken) {
        return { skip: true, reason: 'No auth token' };
    }

    const res = await request('PUT', '/config/testKey', {
        key: 'testKey',
        value: { test: true, timestamp: Date.now() }
    }, true);

    return {
        success: res.ok,
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

async function testListUsers() {
    if (!authToken) {
        return { skip: true, reason: 'No auth token' };
    }

    const res = await request('GET', '/users', null, true);
    return {
        success: res.ok && Array.isArray(res.data),
        error: res.data?.message || `Status: ${res.status}`,
        data: res.data
    };
}

// ===== CLEANUP TESTS =====

async function testDeleteReleaseNote() {
    if (!authToken || !testData.releaseNoteId) {
        return { skip: true, reason: 'No auth token or release note' };
    }

    const res = await request('DELETE', `/release-notes/${testData.releaseNoteId}`, null, true);
    return {
        success: res.ok || res.status === 204,
        error: res.data?.message || `Status: ${res.status}`
    };
}

async function testDeleteChecklist() {
    if (!authToken || !testData.checklistId) {
        return { skip: true, reason: 'No auth token or checklist' };
    }

    const res = await request('DELETE', `/checklists/${testData.checklistId}`, null, true);
    return {
        success: res.ok || res.status === 204,
        error: res.data?.message || `Status: ${res.status}`
    };
}

async function testDeleteDeployment() {
    if (!authToken || !testData.deploymentId) {
        return { skip: true, reason: 'No auth token or deployment' };
    }

    const res = await request('DELETE', `/deployments/${testData.deploymentId}`, null, true);
    return {
        success: res.ok || res.status === 204,
        error: res.data?.message || `Status: ${res.status}`
    };
}

async function testDeleteProduct() {
    if (!authToken || !testData.productId) {
        return { skip: true, reason: 'No auth token or product' };
    }

    const res = await request('DELETE', `/products/${testData.productId}`, null, true);
    return {
        success: res.ok || res.status === 204,
        error: res.data?.message || `Status: ${res.status}`
    };
}

async function testDeleteClient() {
    if (!authToken || !testData.clientId) {
        return { skip: true, reason: 'No auth token or client' };
    }

    const res = await request('DELETE', `/clients/${testData.clientId}`, null, true);
    return {
        success: res.ok || res.status === 204,
        error: res.data?.message || `Status: ${res.status}`
    };
}

// ===== MAIN =====

async function main() {
    console.log(`\n${colors.bold}${colors.blue}Control Tower API Endpoint Tests${colors.reset}`);
    console.log(`${colors.dim}Base URL: ${API_BASE}${colors.reset}`);
    console.log(`${colors.dim}Test User: ${TEST_EMAIL}${colors.reset}\n`);

    // Server connection
    section('Server Connection');
    const serverOk = await test('Server is reachable', testServerConnection);

    if (!serverOk && results.tests[0]?.status === 'failed') {
        console.log(`\n${colors.red}${colors.bold}Server is not reachable. Please ensure the backend is running.${colors.reset}`);
        console.log(`${colors.dim}Run: cd backend && npm run dev${colors.reset}\n`);
        process.exit(1);
    }

    // Authentication
    section('Authentication');
    await test('POST /auth/login', testLogin);
    await test('GET /auth/me', testAuthMe);
    await test('GET /users (list)', testListUsers);

    // Clients
    section('Clients');
    await test('GET /clients (list)', testListClients);
    await test('POST /clients (create)', testCreateClient);
    await test('GET /clients/:id', testGetClient);
    await test('PUT /clients/:id (update)', testUpdateClient);

    // Products
    section('Products');
    await test('GET /products (list)', testListProducts);
    await test('POST /products (create)', testCreateProduct);
    await test('GET /products/:id', testGetProduct);
    await test('PUT /products/:id (update)', testUpdateProduct);

    // Deployments
    section('Deployments');
    await test('GET /deployments (list)', testListDeployments);
    await test('POST /deployments (create)', testCreateDeployment);
    await test('GET /deployments/:id', testGetDeployment);
    await test('PUT /deployments/:id (update)', testUpdateDeployment);

    // Checklists
    section('Checklists');
    await test('GET /checklists (list)', testListChecklists);
    await test('GET /deployments/:id/checklists', testGetDeploymentChecklists);
    await test('POST /checklists (create)', testCreateChecklist);
    await test('PUT /checklists/:id/toggle', testToggleChecklist);

    // Release Notes
    section('Release Notes');
    await test('GET /release-notes (list)', testListReleaseNotes);
    await test('GET /products/:id/release-notes', testGetProductReleaseNotes);
    await test('POST /release-notes (create)', testCreateReleaseNote);

    // Config
    section('Config');
    await test('GET /config (list)', testListConfig);
    await test('GET /config/:key', testGetConfigByKey);
    await test('PUT /config/:key (set)', testSetConfig);

    // Cleanup
    section('Cleanup (DELETE operations)');
    await test('DELETE /release-notes/:id', testDeleteReleaseNote);
    await test('DELETE /checklists/:id', testDeleteChecklist);
    await test('DELETE /deployments/:id', testDeleteDeployment);
    await test('DELETE /products/:id', testDeleteProduct);
    await test('DELETE /clients/:id', testDeleteClient);

    // Summary
    console.log(`\n${colors.bold}${colors.blue}== Test Summary ==${colors.reset}\n`);
    console.log(`  ${colors.green}Passed:${colors.reset}  ${results.passed}`);
    console.log(`  ${colors.red}Failed:${colors.reset}  ${results.failed}`);
    console.log(`  ${colors.yellow}Skipped:${colors.reset} ${results.skipped}`);
    console.log(`  ${colors.dim}Total:${colors.reset}   ${results.passed + results.failed + results.skipped}`);

    if (results.failed > 0) {
        console.log(`\n${colors.red}${colors.bold}Failed Tests:${colors.reset}`);
        results.tests
            .filter(t => t.status === 'failed')
            .forEach(t => {
                console.log(`  ${colors.red}- ${t.name}${colors.reset}: ${t.error}`);
            });
    }

    console.log('');

    process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error(`\n${colors.red}Fatal error:${colors.reset}`, err.message);
    process.exit(1);
});
