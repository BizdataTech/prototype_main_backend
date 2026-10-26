import nodemailer from 'nodemailer';
import axios from 'axios';
import mongoose from 'mongoose';
import AdminUser from '../models/adminUserModel.js';

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  if (host) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: (process.env.SMTP_USER || process.env.GMAIL_USER)?.trim(),
        pass: (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD)?.replace(/\s+/g, ''),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER?.trim(),
      pass: process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') : '',
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Sends order notification email to all Admins/Store Owners,
 * with customer's Email, Phone, and a direct WhatsApp chat link.
 * Also sends a confirmation receipt to the customer if email is available.
 * 
 * Supports:
 * 1. Resend API (RESEND_API_KEY)
 * 2. Gmail / Custom SMTP (GMAIL_USER, GMAIL_APP_PASSWORD / SMTP_*)
 * 
 * @param {Object} order  - The saved order document
 * @param {Array}  items  - Array of { name, quantity, price, image }
 * @param {Object} [customerUser] - Optional populated user record
 */
export const sendOrderEmail = async (order, items, customerUser = null) => {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER)?.trim();
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD)?.replace(/\s+/g, '');

  const hasResend = resendKey && resendKey !== 'your_resend_api_key_here';
  const hasSmtp = user && pass && pass !== 'your_gmail_app_password_here' && pass !== 'your_smtp_password_here';

  if (!hasResend && !hasSmtp) {
    console.warn(
      '[Email] Neither RESEND_API_KEY nor GMAIL_APP_PASSWORD/SMTP credentials are configured in .env. Skipping order notification email.'
    );
    return;
  }

  // Gather all admin email recipients (from DB and .env)
  const recipientSet = new Set();
  if (process.env.NOTIFY_EMAIL) {
    process.env.NOTIFY_EMAIL.split(',').forEach((e) => {
      if (e.trim()) recipientSet.add(e.trim().toLowerCase());
    });
  }
  if (process.env.ADMIN_EMAIL) {
    process.env.ADMIN_EMAIL.split(',').forEach((e) => {
      if (e.trim()) recipientSet.add(e.trim().toLowerCase());
    });
  }
  if (process.env.email) {
    process.env.email.split(',').forEach((e) => {
      if (e.trim()) recipientSet.add(e.trim().toLowerCase());
    });
  }
  if (user) {
    recipientSet.add(user.trim().toLowerCase());
  }

  // Also query AdminUser accounts from MongoDB if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const adminUsers = await AdminUser.find({}, 'email').lean();
      adminUsers.forEach((admin) => {
        if (admin?.email) recipientSet.add(admin.email.trim().toLowerCase());
      });
    } catch (dbErr) {
      console.warn('[Email] Could not query AdminUser collection for admin emails:', dbErr.message);
    }
  }

  const adminEmailList = Array.from(recipientSet);
  if (adminEmailList.length === 0) {
    console.warn('[Email] No admin email address found to send order notification.');
    return;
  }

  const { shippingAddress: addr = {} } = order;
  const customerName =
    addr.name ||
    `${addr.firstName || ''} ${addr.lastName || ''}`.trim() ||
    customerUser?.username ||
    'Customer';
  const customerPhone = addr.phone || addr.alternatePhone || 'N/A';
  const customerEmail = addr.email || customerUser?.email || '';

  // WhatsApp quick-link phone number formatting (e.g. 919876543210)
  const cleanPhoneDigits = customerPhone.replace(/[^0-9]/g, '');
  const waCustomerPhone =
    cleanPhoneDigits.length === 10 ? `91${cleanPhoneDigits}` : cleanPhoneDigits;
  const waChatUrl = waCustomerPhone
    ? `https://wa.me/${waCustomerPhone}?text=${encodeURIComponent(
        `Hi ${customerName}, this is regarding your order #${String(order._id).slice(-8).toUpperCase()} on our store.`
      )}`
    : null;

  const pincode = addr.pincode || addr.postalCode || '';
  const locality = addr.locality ? `${addr.locality}, ` : '';
  const landmark = addr.landmark ? `(Landmark: ${addr.landmark}), ` : '';
  const cityState = [addr.city, addr.state].filter(Boolean).join(', ');
  const fullAddress =
    [addr.address, locality, landmark, cityState, pincode, addr.country || '']
      .filter(Boolean)
      .join(' ')
      .trim() || 'N/A';

  const orderShortId = String(order._id).slice(-8).toUpperCase();
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const adminOrderUrl = `${frontendUrl}/admin/orders`;

  const itemRows = items
    .map(
      (item, i) =>
        `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">
            <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                ${
                  item.image
                    ? `<td style="padding-right:12px;vertical-align:middle;">
                        <img src="${item.image}" alt="${item.name}" width="42" height="42" style="width:42px;height:42px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;display:block;" />
                      </td>`
                    : ''
                }
                <td style="vertical-align:middle;">
                  <span style="font-weight:600;color:#0f172a;line-height:1.4;">${item.name}</span>
                </td>
              </tr>
            </table>
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;text-align:center;color:#475569;">${item.quantity}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;text-align:right;color:#475569;">&#8377;${Number(item.price || 0).toFixed(2)}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a;">&#8377;${(Number(item.quantity || 1) * Number(item.price || 0)).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  // 1. Template for Store Admins
  const adminHtml = `
    <div style="font-family:'Segoe UI',Roboto,-apple-system,sans-serif;max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.06);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:34px 28px;text-align:center;color:#ffffff;">
        <span style="background:#10b981;color:#ffffff;font-size:11px;font-weight:800;letter-spacing:1.5px;padding:6px 14px;border-radius:20px;text-transform:uppercase;">
          &#128722; Someone Placed an Order!
        </span>
        <h1 style="margin:16px 0 6px;font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">
          New Order Alert #${orderShortId}
        </h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;">
          Amount: <strong style="color:#ffffff;">&#8377;${Number(order.totalAmount || 0).toFixed(2)}</strong> &bull; ${order.paymentMethod || 'Cash on Delivery'}
        </p>
      </div>

      <!-- Main Body -->
      <div style="padding:28px;">
        <!-- Customer & Order Cards -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
          <!-- Customer Details -->
          <div style="background:#f8fafc;padding:18px;border-radius:10px;border:1px solid #e2e8f0;">
            <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:10px;letter-spacing:0.5px;">
              &#128100; Customer Details
            </div>
            <div style="font-size:13px;color:#1e293b;line-height:1.7;">
              <div><strong>Name:</strong> ${customerName}</div>
              ${customerUser?.username && customerUser.username !== customerName ? `<div><strong>User Account:</strong> ${customerUser.username}</div>` : ''}
              <div><strong>Phone:</strong> <a href="tel:${customerPhone}" style="color:#0284c7;text-decoration:none;">${customerPhone}</a></div>
              ${
                customerEmail
                  ? `<div><strong>Email:</strong> <a href="mailto:${customerEmail}" style="color:#0284c7;text-decoration:none;">${customerEmail}</a></div>`
                  : `<div style="color:#94a3b8;"><strong>Email:</strong> Not specified</div>`
              }
              <div style="margin-top:6px;"><strong>Address:</strong><br/><span style="color:#475569;">${fullAddress}</span></div>
            </div>

            ${
              waChatUrl
                ? `
                <div style="margin-top:14px;">
                  <a href="${waChatUrl}" target="_blank" style="display:inline-block;background:#25D366;color:#ffffff;font-size:12px;font-weight:700;padding:7px 14px;border-radius:6px;text-decoration:none;box-shadow:0 2px 6px rgba(37,211,102,0.3);">
                    &#128172; Chat on WhatsApp
                  </a>
                </div>
              `
                : ''
            }
          </div>

          <!-- Order Summary Card -->
          <div style="background:#f8fafc;padding:18px;border-radius:10px;border:1px solid #e2e8f0;">
            <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:10px;letter-spacing:0.5px;">
              &#128221; Order Details
            </div>
            <div style="font-size:13px;color:#1e293b;line-height:1.7;">
              <div><strong>Order ID:</strong> #${order._id}</div>
              <div><strong>Date:</strong> ${orderDate}</div>
              <div><strong>Payment Method:</strong> ${order.paymentMethod || 'Cash on Delivery'}</div>
              <div><strong>Payment Status:</strong> <span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;">${order.paymentStatus || 'Pending'}</span></div>
              <div><strong>Order Status:</strong> <span style="background:#e0f2fe;color:#075985;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;">${order.orderStatus || 'Order Placed'}</span></div>
            </div>
          </div>
        </div>

        <!-- Ordered Items -->
        <h3 style="font-size:14px;color:#0f172a;margin:24px 0 10px;text-transform:uppercase;letter-spacing:0.8px;font-weight:800;">
          &#128717;&#65039; Ordered Items
        </h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#0f172a;color:#ffffff;">
              <th style="padding:10px 14px;text-align:left;">Item Name</th>
              <th style="padding:10px 14px;text-align:center;">Qty</th>
              <th style="padding:10px 14px;text-align:right;">Price</th>
              <th style="padding:10px 14px;text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <!-- Grand Total -->
        <div style="margin-top:18px;padding:16px 0;border-top:2px solid #e2e8f0;text-align:right;">
          <span style="font-size:15px;color:#64748b;margin-right:10px;">Grand Total:</span>
          <span style="font-size:24px;font-weight:800;color:#0f172a;">&#8377;${Number(order.totalAmount || 0).toFixed(2)}</span>
        </div>

        <!-- Admin Dashboard Action Button -->
        <div style="margin-top:26px;text-align:center;">
          <a href="${adminOrderUrl}" target="_blank" style="display:inline-block;background:#0f172a;color:#ffffff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;box-shadow:0 4px 12px rgba(15,23,42,0.25);">
            Go to Admin Orders Dashboard &rarr;
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;padding:16px 28px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="font-size:12px;color:#94a3b8;margin:0;">
          Automated notification sent to Admin(s): ${adminEmailList.join(', ')}
        </p>
      </div>
    </div>
  `;

  // Send to all Admin emails
  if (hasResend) {
    for (const adminEmail of adminEmailList) {
      try {
        await axios.post(
          'https://api.resend.com/emails',
          {
            from: 'Store Notification <onboarding@resend.dev>',
            to: [adminEmail],
            subject: `🚨 [New Order] #${orderShortId} placed by ${customerName} - ₹${Number(order.totalAmount || 0).toFixed(2)}`,
            html: adminHtml,
          },
          {
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log(`[Email] Admin order notification sent via Resend successfully to: ${adminEmail}`);
      } catch (adminErr) {
        console.warn(`[Email] Resend notice for ${adminEmail}:`, adminErr.response?.data?.message || adminErr.message);
      }
    }
  } else {
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"Store Notification" <${user}>`,
        to: adminEmailList.join(', '),
        subject: `🚨 [New Order] #${orderShortId} placed by ${customerName} - ₹${Number(order.totalAmount || 0).toFixed(2)}`,
        html: adminHtml,
      });
      console.log(`[Email] Admin order notification sent successfully to: ${adminEmailList.join(', ')}`);
    } catch (adminErr) {
      console.error('[Email] Failed to send admin order notification:', adminErr.message);
    }
  }

  // Customer receipt email (if customer email is provided and not one of the admin emails)
  if (customerEmail && !recipientSet.has(customerEmail.toLowerCase())) {
    const customerHtml = `
      <div style="font-family:'Segoe UI',Roboto,-apple-system,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 6px 20px rgba(0,0,0,0.05);">
        <div style="background:#0f172a;padding:32px 28px;text-align:center;color:#fff;">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;">Order Confirmed! &#127881;</h1>
          <p style="margin:0;color:#94a3b8;font-size:14px;">Hi ${customerName}, thank you for shopping with us!</p>
        </div>
        <div style="padding:28px;">
          <p style="font-size:14px;color:#334155;margin-top:0;">We have received your order <strong>#${orderShortId}</strong> and are preparing it for delivery.</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin:20px 0;border:1px solid #e2e8f0;">
            <thead>
              <tr style="background:#f8fafc;color:#334155;">
                <th style="padding:10px 12px;text-align:left;">Item</th>
                <th style="padding:10px 12px;text-align:center;">Qty</th>
                <th style="padding:10px 12px;text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (it) => `
                  <tr>
                    <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#0f172a;">${it.name}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;color:#475569;">${it.quantity}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:#0f172a;">&#8377;${(it.quantity * it.price).toFixed(2)}</td>
                  </tr>
                `
                )
                .join('')}
            </tbody>
          </table>
          <div style="text-align:right;font-size:18px;font-weight:800;color:#0f172a;margin-top:12px;">
            Total: &#8377;${Number(order.totalAmount || 0).toFixed(2)}
          </div>
          <div style="margin-top:20px;padding:14px;background:#f8fafc;border-radius:8px;font-size:13px;color:#475569;border:1px solid #e2e8f0;">
            <strong>Delivery Address:</strong><br/>${fullAddress}
          </div>
        </div>
        <div style="background:#f8fafc;padding:14px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
          Thank you for your purchase!
        </div>
      </div>
    `;

    if (hasResend) {
      try {
        await axios.post(
          'https://api.resend.com/emails',
          {
            from: 'Order Support <onboarding@resend.dev>',
            to: [customerEmail],
            subject: `Your Order #${orderShortId} is Confirmed!`,
            html: customerHtml,
          },
          {
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log(`[Email] Customer confirmation email sent via Resend to ${customerEmail}`);
      } catch (custErr) {
        console.warn('[Email] Failed to send customer receipt email via Resend:', custErr.response?.data || custErr.message);
      }
    } else {
      try {
        const transporter = createTransporter();
        await transporter.sendMail({
          from: `"Order Support" <${user}>`,
          to: customerEmail,
          subject: `Your Order #${orderShortId} is Confirmed!`,
          html: customerHtml,
        });
        console.log(`[Email] Customer confirmation email sent to ${customerEmail}`);
      } catch (custErr) {
        console.warn('[Email] Failed to send customer receipt email:', custErr.message);
      }
    }
  }
};
