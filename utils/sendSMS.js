import axios from 'axios';

/**
 * Sends an order notification SMS to the owner/admin via Fast2SMS.
 * @param {Object} order  - The saved order document
 * @param {Array}  items  - Array of { name, quantity, price }
 * @param {Object} [customerUser] - Optional user document
 */
export const sendOrderSMS = async (order, items, customerUser = null) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const phone = process.env.NOTIFY_PHONE; // e.g. 9995451633 (10-digit, no country code)

  if (!apiKey || apiKey === 'your_fast2sms_api_key_here') {
    console.warn('[SMS] FAST2SMS_API_KEY not configured in .env – skipping SMS.');
    return;
  }
  if (!phone) {
    console.warn('[SMS] NOTIFY_PHONE not set – skipping SMS.');
    return;
  }

  const { shippingAddress: addr = {} } = order;
  const customerName =
    addr.name ||
    `${addr.firstName || ''} ${addr.lastName || ''}`.trim() ||
    customerUser?.username ||
    'Customer';
  const customerPhone = addr.phone || addr.alternatePhone || 'N/A';

  // Keep SMS concise to fit within standard SMS length
  const message =
    `BizData: NEW ORDER ALERT! ` +
    `ID: #${String(order._id).slice(-8).toUpperCase()} | ` +
    `Total: Rs.${Number(order.totalAmount || 0).toFixed(2)} | ` +
    `Cust: ${customerName.slice(0, 15)} (${customerPhone}) | ` +
    `${order.paymentMethod || 'COD'}. Please check admin panel.`;

  try {
    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'v', // promotional route
        message,
        language: 'english',
        flash: 0,
        numbers: phone,
      },
      {
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.return === true) {
      console.log('[SMS] Admin order alert SMS sent successfully.');
    } else {
      console.warn('[SMS] Fast2SMS rejected the request:', JSON.stringify(response.data));
    }
  } catch (err) {
    const detail = err?.response?.data;
    console.error('[SMS] Error sending SMS:', detail ? JSON.stringify(detail) : err.message);
  }
};
