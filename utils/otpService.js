const CryptoJS = require("crypto-js");
const crypto = require("crypto");
const JWTToken = require("./jwtToken")
const nodemailer = require('nodemailer');

const secretKey = process.env.SECRET_KEY;

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

const sendOtpToEmail = async (recipientEmail,otp) => {
    console.log("The OTP is : "+otp)
    const subject = 'SainikHR - Your One-Time Password (OTP) for Account Registration';
    const htmlContent = `
    <html>
        <head>
        <style>
            body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f6f9;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            }
            .container {
            background-color: #ffffff;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            width: 100%;
            text-align: center;
            }
            h1 {
            color: #0d47a1;
            margin-bottom: 10px;
            }
            p {
            color: #333333;
            font-size: 16px;
            line-height: 1.5;
            }
            .otp {
            display: inline-block;
            margin: 20px 0;
            padding: 15px 30px;
            font-size: 28px;
            letter-spacing: 8px;
            background-color: #e3f2fd;
            color: #0d47a1;
            border-radius: 8px;
            font-weight: bold;
            }
            .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777777;
            }
        </style>
        </head>
        <body>
        <div class="container">
            <h1>Account Verification</h1>
            <p>Dear User,</p>
            <p>Thank you for registering with <strong>SainikHR</strong>.</p>
            <p>To complete your registration, please use the following One-Time Password (OTP):</p>
            <div class="otp">${otp}</div>
            <p>This OTP is valid for <strong>5 minutes</strong>. If you didn’t request this, please ignore this email.</p>
            <p class="footer">Need help? Contact our support team at <a href="mailto:support@sainikhr.com">support@sainikhr.com</a>.</p>
            <p class="footer">Best regards,<br>The SainikHR Team</p>
        </div>
        </body>
    </html>
    `;
    
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'rithu107009@gmail.com',
          pass: process.env.PASSWORD,
        },
      });
  
      const mailOptions = {
        from: 'rithu107009@gmail.com',
        to: recipientEmail,
        subject: subject,
        html: htmlContent,
      };
  
      return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Error sending email:', error);
            reject('Failed to send OTP');
          } else {
            console.log('OTP email sent:', info.response);
            resolve({ message: 'OTP sent successfully!', otp });
          }
        });
      });
    } catch (error) {
      console.error('Error:', error);
      throw new Error('An unexpected error occurred');
    }
};

const generateOtpToken = (email,otp) => {
    const encryptedOTP = CryptoJS.AES.encrypt(otp, secretKey).toString(); 
    return JWTToken({ otp: encryptedOTP, email },"5m")
};

const verifyOtp = (email,otp,data) => {

    if (data.email !== email)  return false

    const decryptedOTP = CryptoJS.AES.decrypt(data.otp, secretKey).toString(CryptoJS.enc.Utf8)

    if (decryptedOTP !== otp) return false

    return true
};

module.exports = {
    sendOtpToEmail,
    generateOTP,
    generateOtpToken,
    verifyOtp
}