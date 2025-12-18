/**
 * Control Tower - Deadline Email Notifications
 *
 * This Firebase Function sends email notifications for upcoming deployment deadlines.
 * It runs daily at 8 AM and checks for deployments due within 7 days.
 *
 * Setup:
 * 1. Configure Firebase Functions secrets:
 *    firebase functions:secrets:set SMTP_HOST
 *    firebase functions:secrets:set SMTP_PORT
 *    firebase functions:secrets:set SMTP_USER
 *    firebase functions:secrets:set SMTP_PASS
 *    firebase functions:secrets:set SMTP_FROM
 *
 * 2. Deploy:
 *    npm run deploy
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Define secrets for SMTP configuration
const smtpHost = defineSecret("SMTP_HOST");
const smtpPort = defineSecret("SMTP_PORT");
const smtpUser = defineSecret("SMTP_USER");
const smtpPass = defineSecret("SMTP_PASS");
const smtpFrom = defineSecret("SMTP_FROM");

// App ID - matches your frontend configuration
const APP_ID = "control-tower";

/**
 * Calculate days difference from today
 */
function getDaysDiff(dateString) {
  if (!dateString) return null;
  const target = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

/**
 * Get urgency level based on days left
 */
function getUrgencyLevel(daysLeft) {
  if (daysLeft < 0) return "OVERDUE";
  if (daysLeft === 0) return "DUE TODAY";
  if (daysLeft === 1) return "DUE TOMORROW";
  if (daysLeft <= 3) return "URGENT";
  return "UPCOMING";
}

/**
 * Generate HTML email content
 */
function generateEmailHtml(product, deployments, type) {
  const urgentStyle = "color: #dc2626; font-weight: bold;";
  const warningStyle = "color: #d97706; font-weight: bold;";
  const infoStyle = "color: #2563eb;";

  const deploymentsHtml = deployments.map(d => {
    const daysLeft = getDaysDiff(d.nextDeliveryDate);
    const urgency = getUrgencyLevel(daysLeft);
    const style = daysLeft <= 0 ? urgentStyle : daysLeft <= 3 ? warningStyle : infoStyle;
    const dateStr = new Date(d.nextDeliveryDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px; vertical-align: top;">
          <strong>${d.clientName || "Unknown Client"}</strong>
          <br><span style="color: #64748b; font-size: 12px;">${d.status}</span>
        </td>
        <td style="padding: 12px; vertical-align: top;">
          <span style="${style}">${urgency}</span>
          <br><span style="color: #64748b; font-size: 12px;">${dateStr}</span>
        </td>
      </tr>
    `;
  }).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Deployment Deadline Alert</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Control Tower</h1>
          <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Deployment Deadline Alert</p>
        </div>

        <div style="padding: 24px;">
          <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px;">${product.name}</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">
              ${deployments.length} deployment${deployments.length > 1 ? "s" : ""} ${type === "overdue" ? "overdue" : "due within 7 days"}
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Client</th>
                <th style="padding: 12px; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${deploymentsHtml}
            </tbody>
          </table>

          <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              This is an automated notification from Control Tower.
              <br>Review and update deployment status at your earliest convenience.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email content
 */
function generateEmailText(product, deployments, type) {
  const deploymentsText = deployments.map(d => {
    const daysLeft = getDaysDiff(d.nextDeliveryDate);
    const urgency = getUrgencyLevel(daysLeft);
    const dateStr = new Date(d.nextDeliveryDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return `- ${d.clientName || "Unknown Client"}: ${urgency} (${dateStr}) - Status: ${d.status}`;
  }).join("\n");

  return `
Control Tower - Deployment Deadline Alert

Product: ${product.name}
${deployments.length} deployment${deployments.length > 1 ? "s" : ""} ${type === "overdue" ? "overdue" : "due within 7 days"}

${deploymentsText}

---
This is an automated notification from Control Tower.
Review and update deployment status at your earliest convenience.
  `.trim();
}

/**
 * Send email notification
 */
async function sendEmail(transporter, to, subject, html, text) {
  const mailOptions = {
    from: process.env.SMTP_FROM || smtpFrom.value(),
    to: to.join(", "),
    subject,
    html,
    text,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Main function to check deadlines and send notifications
 */
async function checkDeadlinesAndNotify() {
  const db = admin.firestore();

  // Get all deployments
  const deploymentsSnap = await db
    .collection("artifacts")
    .doc(APP_ID)
    .collection("public")
    .collection("data")
    .collection("deployments")
    .get();

  // Get all products
  const productsSnap = await db
    .collection("artifacts")
    .doc(APP_ID)
    .collection("public")
    .collection("data")
    .collection("products")
    .get();

  // Get all clients
  const clientsSnap = await db
    .collection("artifacts")
    .doc(APP_ID)
    .collection("public")
    .collection("data")
    .collection("clients")
    .get();

  const deployments = deploymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const clients = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Create lookup maps
  const productMap = new Map(products.map(p => [p.id, p]));
  const clientMap = new Map(clients.map(c => [c.id, c]));

  // Group deployments by product
  const productDeployments = new Map();

  deployments.forEach(d => {
    if (d.status === "Released" || !d.nextDeliveryDate) return;

    const daysLeft = getDaysDiff(d.nextDeliveryDate);
    if (daysLeft === null || daysLeft > 7) return;

    const product = productMap.get(d.productId);
    if (!product || !product.notificationEmails || product.notificationEmails.length === 0) return;

    const client = clientMap.get(d.clientId);
    let clientName = client?.name;
    if (!clientName) {
      if (d.deploymentType === "ga") clientName = "GA Release";
      else if (d.deploymentType === "generic") clientName = "Generic";
      else clientName = "Unknown";
    }

    const enrichedDeployment = {
      ...d,
      clientName,
      daysLeft,
    };

    if (!productDeployments.has(d.productId)) {
      productDeployments.set(d.productId, []);
    }
    productDeployments.get(d.productId).push(enrichedDeployment);
  });

  // Create email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || smtpHost.value(),
    port: parseInt(process.env.SMTP_PORT || smtpPort.value() || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || smtpUser.value(),
      pass: process.env.SMTP_PASS || smtpPass.value(),
    },
  });

  // Send notifications for each product
  const results = [];

  for (const [productId, deploys] of productDeployments) {
    const product = productMap.get(productId);
    if (!product || !product.notificationEmails || product.notificationEmails.length === 0) continue;

    // Sort by urgency
    deploys.sort((a, b) => a.daysLeft - b.daysLeft);

    const hasOverdue = deploys.some(d => d.daysLeft < 0);
    const hasDueToday = deploys.some(d => d.daysLeft === 0);
    const hasUrgent = deploys.some(d => d.daysLeft <= 3);

    // Determine email subject
    let subject;
    let type;
    if (hasOverdue) {
      subject = `[OVERDUE] ${product.name} - ${deploys.filter(d => d.daysLeft < 0).length} deployment(s) overdue`;
      type = "overdue";
    } else if (hasDueToday) {
      subject = `[DUE TODAY] ${product.name} - Deployment deadline`;
      type = "due-today";
    } else if (hasUrgent) {
      subject = `[URGENT] ${product.name} - ${deploys.length} deployment(s) due soon`;
      type = "urgent";
    } else {
      subject = `[Upcoming] ${product.name} - ${deploys.length} deployment(s) due within 7 days`;
      type = "upcoming";
    }

    const html = generateEmailHtml(product, deploys, type);
    const text = generateEmailText(product, deploys, type);

    try {
      await sendEmail(transporter, product.notificationEmails, subject, html, text);
      results.push({
        productId,
        productName: product.name,
        emailsSent: product.notificationEmails.length,
        deploymentsCount: deploys.length,
        status: "success",
      });
      console.log(`Email sent for ${product.name} to ${product.notificationEmails.join(", ")}`);
    } catch (error) {
      results.push({
        productId,
        productName: product.name,
        status: "error",
        error: error.message,
      });
      console.error(`Failed to send email for ${product.name}:`, error);
    }
  }

  return results;
}

/**
 * Scheduled function - runs daily at 8 AM UTC
 */
exports.sendDeadlineNotifications = onSchedule({
  schedule: "0 8 * * *", // Every day at 8 AM UTC
  timeZone: "UTC",
  secrets: [smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom],
}, async (event) => {
  console.log("Running deadline notification check...");
  const results = await checkDeadlinesAndNotify();
  console.log("Notification results:", JSON.stringify(results, null, 2));
  return results;
});

/**
 * HTTP trigger for testing - can be called manually
 * URL: https://[region]-[project].cloudfunctions.net/testDeadlineNotifications
 */
exports.testDeadlineNotifications = onRequest({
  secrets: [smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom],
}, async (req, res) => {
  try {
    console.log("Manual trigger of deadline notification check...");
    const results = await checkDeadlinesAndNotify();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("Error in testDeadlineNotifications:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
