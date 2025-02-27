const { generateOTP, sendOtpToEmail, generateOtpToken } = require("../utils/otpService")

async function sendOTP(req,res) {
    try {
        const data = req.query?.email

        if(!data || data === "") {
            return res.status(400).json({ message: "Email is required" })
        }

        const otp = generateOTP()
        await sendOtpToEmail(data,otp)

        const token = generateOtpToken(data,otp)
        return res.status(200).json({ message: "OTP Generated Successfully" , token })
    } catch (error) {
        console.error("Error OTP generation : ", error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

async function googleRedirect(req,res) {
    try {
        const token = req.user.token;
        res.redirect(`http://localhost:4080/veteran?token=${token}`);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" })
    }
}

module.exports = {
    sendOTP,
    googleRedirect
}