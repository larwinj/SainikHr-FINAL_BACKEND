const CryptoJS = require("crypto-js");
const crypto = require("crypto");
const JWTToken = require("./jwtToken");
const nodemailer = require('nodemailer');
const { User } = require("../models");

const secretKey = process.env.SECRET_KEY;

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

const sendOtpToEmail = async (recipientEmail, otp, ipAddress) => {
  console.log("The OTP is: " + otp);
  const currentDateTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }); // Adjust timezone as needed (e.g., IST)
  
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
          .terms-acceptance {
          margin: 20px 0;
          padding: 15px;
          background-color: #e8f5e9;
          border-radius: 8px;
          font-size: 14px;
          color: #2e7d32;
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
          <div class="terms-acceptance">
            <strong>Terms Acceptance Confirmation:</strong><br>
            You have accepted the SainikHR Terms and Conditions using IP address <strong>${ipAddress}</strong> on <strong>${currentDateTime}</strong>.
            This is logged for your records.
          </div>
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
        user: process.env.GMAIL,
        pass: process.env.PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL,
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

const sendJobDeletionEmail = async (job) => {
  try {
    // Fetch the corporate user's email from the User model using job.userId
    const user = await User.findOne({ where: { userId: job.userId } });
    if (!user) {
      console.error(`User not found for userId: ${job.userId}`);
      throw new Error('User not found');
    }

    // Only send email if postedMethod is 'private'
    if (job.postedMethod !== 'private') {
      console.log(`Job ${job.jobId} is not private; no email sent.`);
      return { message: 'Email not sent for public job' };
    }

    const recipientEmail = user.email;
    const subject = 'SainikHR - Your Job Posting Has Been Deleted by Admin';
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
                color: #d32f2f;
                margin-bottom: 10px;
            }
            p {
                color: #333333;
                font-size: 16px;
                line-height: 1.5;
            }
            .job-details {
                display: inline-block;
                margin: 20px 0;
                padding: 15px 30px;
                font-size: 18px;
                background-color: #ffebee;
                color: #d32f2f;
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
            <h1>Job Posting Deleted</h1>
            <p>Dear ${user.firstName || 'User'},</p>
            <p>We regret to inform you that your job posting on <strong>SainikHR</strong> has been deleted by an administrator.</p>
            <div class="job-details">
                <strong>Role:</strong> ${job.role || 'N/A'}<br>
                <strong>Company:</strong> ${job.companyName || 'N/A'}
            </div>
            <p>If you believe this was a mistake or need further clarification, please contact our support team.</p>
            <p class="footer">Need help? Contact our support team at <a href="mailto:support@sainikhr.com">support@sainikhr.com</a>.</p>
            <p class="footer">Best regards,<br>The SainikHR Team</p>
        </div>
        </body>
    </html>
    `;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL,
        pass: process.env.PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL,
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
    };

    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending job deletion email:', error);
          reject(new Error('Failed to send job deletion email'));
        } else {
          console.log('Job deletion email sent:', info.response);
          resolve({ message: 'Job deletion email sent successfully!' });
        }
      });
    });
  } catch (error) {
    console.error('Error in sendJobDeletionEmail:', error);
    throw error; // Let the caller handle the error
  }
};

const sendMutualMatchEmail = async (application, job, user) => {
  try {
    // Check if user exists
    if (!user) {
      console.error(`User not found for userId: ${application.userId}`);
      throw new Error('User not found');
    }

    const recipientEmail = user.email;
    const subject = 'SainikHR - Exciting News: You Have a Job Match!';
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
                color: #2e7d32;
                margin-bottom: 10px;
            }
            p {
                color: #333333;
                font-size: 16px;
                line-height: 1.5;
            }
            .job-details {
                display: inline-block;
                margin: 20px 0;
                padding: 15px 30px;
                font-size: 18px;
                background-color: #e8f5e9;
                color: #2e7d32;
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
            <h1>Congratulations on Your Job Match!</h1>
            <p>Dear ${user?.firstName || 'Veteran'},</p>
            <p>We are thrilled to inform you that you have been mutually matched for a job opportunity on <strong>SainikHR</strong>!</p>
            <div class="job-details">
                <strong>Role:</strong> ${job?.role || 'N/A'}<br>
                <strong>Company:</strong> ${job?.companyName || 'N/A'}
            </div>
            <p>Please check your SainikHR account for more details and next steps to proceed with this opportunity.</p>
            <p class="footer">Need help? Contact our support team at <a href="mailto:support@sainikhr.com">support@sainikhr.com</a>.</p>
            <p class="footer">Best regards,<br>The SainikHR Team</p>
        </div>
        </body>
    </html>
    `;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL,
        pass: process.env.PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL,
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
    };

    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending mutual match email:', error);
          reject(new Error('Failed to send mutual match email'));
        } else {
          console.log('Mutual match email sent:', info.response);
          resolve({ message: 'Mutual match email sent successfully!' });
        }
      });
    });
  } catch (error) {
    console.error('Error in sendMutualMatchEmail:', error);
    throw error; // Let the caller handle the error
  }
};

const generateOtpToken = (email, otp, ipAddress) => {
  const currentDateTime = new Date().toISOString(); // For token payload
  const encryptedOTP = CryptoJS.AES.encrypt(otp, secretKey).toString(); 
  return JWTToken({ otp: encryptedOTP, email, ipAddress, acceptanceTime: currentDateTime }, "5m");
};

const verifyOtp = (email, otp, data) => {
  console.log("The data is: ", data);

  if (data.email !== email) return false;

  const decryptedOTP = CryptoJS.AES.decrypt(data.otp, secretKey).toString(CryptoJS.enc.Utf8);
  if (decryptedOTP !== otp) return false;

  return true;
};

module.exports = {
  sendOtpToEmail,
  generateOTP,
  generateOtpToken,
  verifyOtp,
  sendMutualMatchEmail,
  sendJobDeletionEmail
};
