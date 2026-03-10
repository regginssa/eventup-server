const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../models/User");

const generateOTP = () => {
  const min = 10000;
  const max = 99999;
  return Math.floor(min + crypto.randomInt(max - min + 1)).toString();
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const sendOTP = async (email, expiryMinutes = 3) => {
  try {
    if (!email) {
      return true;
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const user = await User.findOne({ email });
    if (!user) {
      return false;
    }

    const mailOptions = {
      from: `"Account Verification" <${"no-reply@charlieeventup.eu"}>`,
      to: email,
      subject: "Your Verification Code",
      text: `Your verification code is: ${otp}\n\nThis code will expire in ${expiryMinutes} minutes.\n\nIf you didn't request this code, please ignore this email.`,
      html: `
<div style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f5f7fb;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(90deg,#C427E0,#844AFF,#12A9FF);padding:30px;text-align:center;">
              <img src="https://charlieunicornai.eu/_next/static/media/logo.9e6f2f6a.png" 
                   alt="EventUp | Charlie Unicorn AI"
                   style="height:60px;margin-bottom:10px;" />
              <div style="color:#ffffff;font-size:20px;font-weight:bold;">
                EventUp
              </div>
              <div style="color:#ffffff;font-size:12px;opacity:0.9;">
                by Charlie Unicorn AI
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px 35px;text-align:center;color:#333333;">

              <h2 style="margin:0 0 15px 0;font-size:22px;">
                Your Verification Code
              </h2>

              <p style="font-size:14px;color:#555;margin-bottom:25px;">
                Use the code below to verify your account.
              </p>

              <!-- OTP Box -->
              <div style="
                display:inline-block;
                font-size:32px;
                letter-spacing:6px;
                font-weight:bold;
                padding:16px 30px;
                border-radius:10px;
                background:linear-gradient(90deg,#C427E0,#844AFF,#12A9FF);
                color:white;
                margin-bottom:20px;
              ">
                ${otp}
              </div>

              <p style="font-size:14px;color:#555;margin-top:10px;">
                This code will expire in 
                <strong>${expiryMinutes} minutes</strong>.
              </p>

              <p style="font-size:13px;color:#777;margin-top:25px;">
                If you didn't request this verification code, you can safely ignore this email.
              </p>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 35px;">
              <hr style="border:none;border-top:1px solid #eee;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:25px 35px;text-align:center;font-size:12px;color:#888;">

              <p style="margin:5px 0;">
                Need help? Contact us at
                <a href="mailto:team@charlieunicornai.eu" 
                   style="color:#844AFF;text-decoration:none;font-weight:bold;">
                   team@charlieunicornai.eu
                </a>
              </p>

              <p style="margin:5px 0;">
                © ${new Date().getFullYear()} Charlie Unicorn AI
              </p>

              <p style="margin:5px 0;color:#aaa;">
                EventUp | Secure Account Verification
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</div>
`,
    };

    const info = await transporter.sendMail(mailOptions);

    if (info.accepted.length > 0) {
      user.otp = {
        code: otp,
        expiresAt,
      };
      await user.save();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Unexpected error in sendOTP:", error);
    return false;
  }
};

const sendMessageToSupport = async ({
  firstName,
  lastName,
  email,
  subject,
  text,
}) => {
  try {
    if (!email || !text) {
      return false;
    }

    const mailOptions = {
      from: `"EventUp Support Form" <no-reply@charlieeventup.eu>`,
      to: "team@charlieunicornai.eu",
      subject: `Support Request: ${subject || "New Message"}`,
      text: `
New support request from EventUp

Name: ${firstName || ""} ${lastName || ""}
Email: ${email}
Subject: ${subject || "No subject"}

Message:
${text}
`,
      html: `
<div style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f5f7fb;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(90deg,#C427E0,#844AFF,#12A9FF);padding:30px;text-align:center;">
              <img src="https://charlieunicornai.eu/_next/static/media/logo.9e6f2f6a.png" 
                   alt="EventUp | Charlie Unicorn AI"
                   style="height:60px;margin-bottom:10px;" />
              <div style="color:#ffffff;font-size:20px;font-weight:bold;">
                EventUp
              </div>
              <div style="color:#ffffff;font-size:12px;opacity:0.9;">
                by Charlie Unicorn AI
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px 35px;color:#333333;">

              <h2 style="margin:0 0 20px 0;font-size:22px;text-align:center;">
                New Support Request
              </h2>

              <p style="font-size:14px;color:#555;margin-bottom:25px;text-align:center;">
                A new message has been submitted through the EventUp support form.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333;margin-bottom:20px;">
                <tr>
                  <td style="padding:8px 0;font-weight:bold;">Name:</td>
                  <td style="padding:8px 0;">${firstName || ""} ${lastName || ""}</td>
                </tr>

                <tr>
                  <td style="padding:8px 0;font-weight:bold;">Email:</td>
                  <td style="padding:8px 0;">${email}</td>
                </tr>

                <tr>
                  <td style="padding:8px 0;font-weight:bold;">Subject:</td>
                  <td style="padding:8px 0;">${subject || "No subject"}</td>
                </tr>
              </table>

              <!-- Message Box -->
              <div style="
                background:#f7f8fc;
                border-radius:10px;
                padding:20px;
                font-size:14px;
                line-height:1.6;
                color:#444;
                border:1px solid #eee;
              ">
                ${text}
              </div>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 35px;">
              <hr style="border:none;border-top:1px solid #eee;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:25px 35px;text-align:center;font-size:12px;color:#888;">

              <p style="margin:5px 0;">
                Sent via EventUp Contact Form
              </p>

              <p style="margin:5px 0;">
                © ${new Date().getFullYear()} Charlie Unicorn AI
              </p>

              <p style="margin:5px 0;color:#aaa;">
                EventUp | Support Notification
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</div>
`,
    };

    const info = await transporter.sendMail(mailOptions);

    if (info.accepted.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Unexpected error in sendMessageToSupport:", error);
    return false;
  }
};

module.exports = { sendOTP, sendMessageToSupport };
