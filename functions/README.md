# Control Tower - Firebase Functions

This folder contains Firebase Cloud Functions for sending deadline email notifications.

## Features

- **Daily Notifications**: Automatically sends emails at 8 AM UTC for deployments due within 7 days
- **Urgency Levels**: Different email subjects for overdue, due today, urgent (3 days), and upcoming
- **Product-Based Emails**: Notifications are sent to the email addresses configured on each product
- **Beautiful HTML Emails**: Responsive, professional email templates

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure SMTP Secrets

The function uses Firebase Functions secrets for SMTP configuration. Set them using the Firebase CLI:

```bash
# SMTP server host (e.g., smtp.gmail.com, smtp.sendgrid.net)
firebase functions:secrets:set SMTP_HOST

# SMTP server port (usually 587 for TLS, 465 for SSL)
firebase functions:secrets:set SMTP_PORT

# SMTP username (email address or API key)
firebase functions:secrets:set SMTP_USER

# SMTP password or API key
firebase functions:secrets:set SMTP_PASS

# From email address (e.g., "Control Tower <notifications@yourcompany.com>")
firebase functions:secrets:set SMTP_FROM
```

### 3. Deploy

```bash
npm run deploy
```

## Email Providers

### Gmail

```
SMTP_HOST: smtp.gmail.com
SMTP_PORT: 587
SMTP_USER: your-email@gmail.com
SMTP_PASS: (App Password - enable 2FA and generate app password)
SMTP_FROM: "Control Tower <your-email@gmail.com>"
```

### SendGrid

```
SMTP_HOST: smtp.sendgrid.net
SMTP_PORT: 587
SMTP_USER: apikey
SMTP_PASS: (Your SendGrid API Key)
SMTP_FROM: "Control Tower <your-verified-sender@domain.com>"
```

### Mailgun

```
SMTP_HOST: smtp.mailgun.org
SMTP_PORT: 587
SMTP_USER: postmaster@your-domain.mailgun.org
SMTP_PASS: (Your Mailgun SMTP password)
SMTP_FROM: "Control Tower <notifications@your-domain.mailgun.org>"
```

## Testing

You can manually trigger the function to test:

```bash
# Using Firebase CLI
firebase functions:shell
> testDeadlineNotifications()

# Or via HTTP (after deployment)
curl https://[region]-[project].cloudfunctions.net/testDeadlineNotifications
```

## Email Schedule

The function runs daily at 8 AM UTC. To change the schedule, modify the `schedule` parameter in `index.js`:

```javascript
schedule: "0 8 * * *" // Every day at 8 AM UTC
```

Examples:
- `"0 8 * * 1-5"` - Weekdays only at 8 AM
- `"0 8,14 * * *"` - Twice daily at 8 AM and 2 PM
- `"0 9 * * *"` - Daily at 9 AM

## Logs

View function logs:

```bash
npm run logs
```

Or in Firebase Console: Functions > Logs
