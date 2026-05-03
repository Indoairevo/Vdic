const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter && process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendEmail(to, subject, text, html) {
  console.log('Sending email. SMTP_HOST:', process.env.SMTP_HOST ? 'Set' : 'Not Set', 'SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not Set');
  
  const mailTransporter = getTransporter();

  if (!mailTransporter) {
    console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
    return { mock: true, message: 'SMTP not configured. Mock email logged.' };
  }
  try {
    const info = await mailTransporter.sendMail({
      from: process.env.SMTP_FROM || '"School ERP" <noreply@school.com>',
      to,
      subject,
      text,
      html,
    });
    console.log(`Email sent to ${to}`);
    return { mock: false, message: 'Email sent successfully.', info };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = { sendEmail };
