import axios from 'axios';
import twilio from 'twilio';

/**
 * Sends an order notification WhatsApp message to all configured Admin numbers.
 * Supports both CallMeBot (free) and Twilio WhatsApp.
 *
 * Method 1 - CallMeBot (Free & easy for personal WhatsApp):
 *   1. Save +34 644 59 73 42 as "CallMeBot" in WhatsApp contacts.
 *   2. Send this WhatsApp message: "I allow callmebot to send me messages"
 *   3. It replies with your API key -> set CALLMEBOT_API_KEY in .env.
 *   4. Set NOTIFY_PHONE_WHATSAPP=919995451633 (country code + number, no +).
 *
 * Method 2 - Twilio WhatsApp (Optional):
 *   Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, NOTIFY_PHONE_WHATSAPP.
 *
 * @param {Object} order  - The saved order document
 * @param {Array}  items  - Array of { name, quantity, price }
 * @param {Object} [customerUser] - Optional user document
 */
export const sendOrderWhatsApp = async (order, items, customerUser = null) => {
  const callmebotKey = process.env.CALLMEBOT_API_KEY;
  const rawNotifyPhones =
    process.env.NOTIFY_PHONE_WHATSAPP || process.env.NOTIFY_PHONE || '';
  
  // Parse one or multiple admin phone numbers (comma-separated supported)
  const adminPhones = rawNotifyPhones
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (adminPhones.length === 0) {
    console.warn('[WhatsApp] No admin phone number found in NOTIFY_PHONE_WHATSAPP or NOTIFY_PHONE.');
    return;
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g. 'whatsapp:+14155238886'

  const { shippingAddress: addr = {} } = order;
  const customerName =
    addr.name ||
    `${addr.firstName || ''} ${addr.lastName || ''}`.trim() ||
    customerUser?.username ||
    'Customer';
  const customerPhone = addr.phone || addr.alternatePhone || 'N/A';
  const customerEmail = addr.email || customerUser?.email || 'N/A';

  const pincode = addr.pincode || addr.postalCode || '';
  const locality = addr.locality ? `${addr.locality}, ` : '';
  const cityState = [addr.city, addr.state].filter(Boolean).join(', ');
  const fullAddress =
    [addr.address, locality, cityState, pincode]
      .filter(Boolean)
      .join(' ')
      .trim() || 'N/A';

  const orderShortId = String(order._id).slice(-8).toUpperCase();
  const orderTime = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const itemsList = items
    .map(
      (item, i) =>
        `${i + 1}. ${item.name} x${item.quantity} = Rs.${(Number(item.quantity || 1) * Number(item.price || 0)).toFixed(2)}`
    )
    .join('\n');

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const cleanCustomerPhone = customerPhone.replace(/[^0-9]/g, '');
  const waChat = cleanCustomerPhone
    ? `https://wa.me/${cleanCustomerPhone.length === 10 ? '91' + cleanCustomerPhone : cleanCustomerPhone}`
    : '';

  // Clean formatted WhatsApp message for Admin
  const messageText =
    `🚨 *NEW ORDER ALERT!* 🛒\n` +
    `Someone just placed an order on your store!\n\n` +
    `🆔 *Order ID:* #${orderShortId}\n` +
    `👤 *Customer:* ${customerName}\n` +
    `📧 *Email:* ${customerEmail}\n` +
    `📞 *Phone:* ${customerPhone}\n` +
    (waChat ? `💬 *Direct WhatsApp:* ${waChat}\n` : '') +
    `📍 *Address:* ${fullAddress}\n\n` +
    `🛍️ *Items Ordered:*\n${itemsList}\n\n` +
    `💰 *Total Amount:* Rs.${Number(order.totalAmount || 0).toFixed(2)}\n` +
    `💳 *Payment:* ${order.paymentMethod || 'Cash on Delivery'} (${order.paymentStatus || 'Pending'})\n` +
    `⏰ *Time:* ${orderTime}\n\n` +
    `🔗 *Admin Panel:* ${frontendUrl}/admin/orders`;

  // 1. Try Twilio WhatsApp if configured
  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const client = twilio(twilioSid, twilioToken);
      for (const phone of adminPhones) {
        const formattedTo = phone.startsWith('whatsapp:')
          ? phone
          : `whatsapp:+${phone.replace(/^\+/, '')}`;

        await client.messages.create({
          body: messageText,
          from: twilioFrom,
          to: formattedTo,
        });
        console.log(`[WhatsApp] Order notification sent via Twilio to ${formattedTo}`);
      }
      return;
    } catch (twErr) {
      console.error('[WhatsApp] Twilio WhatsApp failed:', twErr.message);
    }
  }

  // 2. Try CallMeBot WhatsApp (Free service)
  const trimmedCmbKey = callmebotKey?.trim();
  if (trimmedCmbKey && trimmedCmbKey !== 'your_callmebot_api_key_here') {
    try {
      const encodedMessage = encodeURIComponent(messageText);
      for (const phone of adminPhones) {
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) {
          cleanPhone = `91${cleanPhone}`;
        }
        const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodedMessage}&apikey=${trimmedCmbKey}`;

        const response = await axios.get(url, { timeout: 10000 });
        if (response.status === 200) {
          console.log(`[WhatsApp] Admin order notification sent via CallMeBot to ${cleanPhone}`);
        } else {
          console.warn('[WhatsApp] CallMeBot response for', cleanPhone, response.status, response.data);
        }
      }
      return;
    } catch (cmbErr) {
      console.error('[WhatsApp] CallMeBot error:', cmbErr.response?.data || cmbErr.message);
      return;
    }
  }

  console.warn(
    '[WhatsApp] WhatsApp notification skipped: Neither CallMeBot (CALLMEBOT_API_KEY) nor Twilio credentials are configured in .env.'
  );
};
