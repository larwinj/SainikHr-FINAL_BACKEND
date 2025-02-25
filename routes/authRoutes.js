const express = require("express")
const passport = require("passport")
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const authController = require("../controllers/authController")

router.get('/jwt',authMiddleware.authenticateToken,(req,res) => res.json({data : req.user}))
router.get('/sendotp',authController.sendOTP)
router.get("/google",passport.authenticate("google", { scope: ["profile", "email"] }))
router.get(
    "/google/callback",
    passport.authenticate("google", { session: false }),
    (req, res) => {
        res.json({ message: "OAuth Login Successful", token: req.user.token })
    }
)

module.exports = router
