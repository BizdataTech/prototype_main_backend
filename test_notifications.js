import 'dotenv/config';
import nodemailer from 'nodemailer';
import axios from 'axios';

async function testEmail() {
  console.log('\n--- 1. Testing Email Setup ---');
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  const to = process.env.NOTIFY_EMAIL?.trim() || user || 'arathyh8@gmail.com';

  console.log(`RESEND_API_KEY: ${resendKey ? (resendKey === 'your_resend_api_key_here' ? '(placeholder)' : resendKey.slice(0, 6) + '...') : '(not set)'}`);
  console.log(`GMAIL_USER: ${user || '(not set)'}`);
  console.log(`GMAIL_APP_PASSWORD: ${pass ? (pass === 'your_gmail_app_password_here' ? '(placeholder)' : '****** (configured)') : '(not set)'}`);
  console.log(`NOTIFY_EMAIL: ${to || '(not set)'}`);

  // 1. Try Resend if configured
  if (resendKey && resendKey !== 'your_resend_api_key_here') {
    try {
      console.log('Sending test email via Resend API to:', to);
      const res = await axios.post(
        'https://api.resend.com/emails',
        {
          from: 'Store Test <onboarding@resend.dev>',
          to: [to],
          subject: '🧪 Store Notification Test Email (via Resend)',
          html: `
            <div style="font-family:sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:10px;">
              <h2 style="color:#10b981;">✅ Email Notifications are Working!</h2>
              <p>Your Resend API Key is valid and order notification emails are active.</p>
            </div>
          `,
        },
        {
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('✅ Email sent successfully via Resend! ID:', res.data?.id);
      return;
    } catch (rErr) {
      console.error('❌ Resend API sending failed:', rErr.response?.data || rErr.message);
      return;
    }
  }

  if (!user || !pass || pass === 'your_gmail_app_password_here') {
    console.error('❌ Email test skipped: Neither RESEND_API_KEY nor GMAIL_APP_PASSWORD is set in .env.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  try {
    console.log('Verifying connection with Gmail SMTP server...');
    await transporter.verify();
    console.log('Sending test email to:', to);
    const info = await transporter.sendMail({
      from: `"Store Test" <${user}>`,
      to,
      subject: '🧪 Store Notification Test Email',
      html: `
        <div style="font-family:sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:10px;">
          <h2 style="color:#10b981;">✅ Email Notifications are Working!</h2>
          <p>Your Gmail credentials are valid and ready to receive order notifications.</p>
        </div>
      `,
    });
    console.log('✅ Email sent successfully! Message ID:', info.messageId);
  } catch (err) {
    console.error('❌ Email sending failed:', err.message);
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      console.log('💡 Invalid credentials error: Ensure you are using a 16-character Google App Password, NOT your normal Gmail password.');
    }
  }
}

async function testWhatsApp() {
  console.log('\n--- 2. Testing WhatsApp Setup ---');
  const callmebotKey = process.env.CALLMEBOT_API_KEY?.trim();
  const rawNotifyPhones = process.env.NOTIFY_PHONE_WHATSAPP || process.env.NOTIFY_PHONE;

  console.log(`CALLMEBOT_API_KEY: ${callmebotKey ? (callmebotKey === 'your_callmebot_api_key_here' ? '(placeholder)' : callmebotKey) : '(not set)'}`);
  console.log(`NOTIFY_PHONE: ${rawNotifyPhones || '(not set)'}`);

  if (!callmebotKey || callmebotKey === 'your_callmebot_api_key_here') {
    console.error('❌ WhatsApp test skipped: CALLMEBOT_API_KEY is not configured in .env.');
    console.log('👉 To enable free CallMeBot WhatsApp notifications:');
    console.log('   1. Add +34 644 59 73 42 to your phone contacts as "CallMeBot"');
    console.log('   2. Send this exact message on WhatsApp: "I allow callmebot to send me messages"');
    console.log('   3. CallMeBot will reply with your API Key (e.g. 123456)');
    console.log('   4. Put that key in backend/.env: CALLMEBOT_API_KEY=your_key');
    return;
  }

  let cleanPhone = (rawNotifyPhones || '').replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

  try {
    const text = encodeURIComponent('🧪 *Store Notification Test:* WhatsApp alerts are working properly!');
    const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${text}&apikey=${callmebotKey}`;
    console.log(`Sending test WhatsApp to ${cleanPhone}...`);
    const res = await axios.get(url, { timeout: 10000 });
    if (res.status === 200) {
      console.log('✅ WhatsApp message sent successfully via CallMeBot!');
    } else {
      console.warn('⚠️ CallMeBot returned status:', res.status, res.data);
    }
  } catch (err) {
    console.error('❌ WhatsApp error:', err.response?.data || err.message);
  }
}

async function run() {
  console.log('=== Checking Order Notification Configuration ===');
  await testEmail();
  await testWhatsApp();
  console.log('\n=================================================');
}

run();
