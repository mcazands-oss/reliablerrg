const nodemailer = require('nodemailer');

// Email transporter - configure with your credentials
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Rate limiting map (store in memory - resets on function restart)
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'https://reliablerrg.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    return res.status(200).end();
  }

  const { name, phone, email, roofType, message, website_url } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress;

  // Honeypot check
  if (website_url && website_url.trim().length > 0) {
    return res.status(400).json({ success: false, message: 'Spam detected' });
  }

  // Rate limiting
  const now = Date.now();
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const requests = rateLimitMap.get(ip).filter(time => now - time < RATE_LIMIT_WINDOW);
  rateLimitMap.set(ip, requests);

  if (requests.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }

  // Track this submission
  requests.push(now);
  rateLimitMap.set(ip, requests);

  // Validate required fields
  const errors = [];
  if (!name || name.trim().length < 2) errors.push('Name is required');
  if (!phone || phone.trim().length < 5) errors.push('Phone is required');
  if (!roofType) errors.push('Roof type is required');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  try {
    // Email to admin
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `New Estimate Request from ${name}`,
      html: `
        <h2>New Estimate Request</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        ${email ? `<p><strong>Email:</strong> ${escapeHtml(email)}</p>` : ''}
        <p><strong>Roof Type:</strong> ${escapeHtml(roofType)}</p>
        ${message ? `<p><strong>Project Details:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>` : ''}
        <hr>
        <p><small>From: reliablerrg.com</small></p>
      `
    });

    // Confirmation email to customer (if email provided)
    if (email) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'We received your estimate request',
        html: `
          <h2>Thank you, ${escapeHtml(name)}!</h2>
          <p>We've received your roofing estimate request. Scott will reach out within one business day to discuss your project.</p>
          <p>If you have any urgent questions, call us at <strong>(903) 275-5510</strong></p>
          <hr>
          <p><strong>Your request details:</strong></p>
          <p><strong>Roof Type:</strong> ${escapeHtml(roofType)}</p>
          ${message ? `<p><strong>Project Details:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>` : ''}
          <hr>
          <p>Reliable Roofing Restoration & Glass<br>247 Loving Lane, Gun Barrel City, TX<br>(903) 275-5510</p>
        `
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Thank you! We received your request. Scott will reach out within one business day.'
    });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send request. Please try again or call us at (903) 275-5510.'
    });
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
