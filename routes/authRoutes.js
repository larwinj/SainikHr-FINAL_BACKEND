const express = require("express")
const passport = require("passport")
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const authController = require("../controllers/authController")
const validationMiddleware = require('../middlewares/validationMiddleware')
const validators = require('../utils/validators')

router.get('/jwt',authMiddleware.authenticateToken,(req,res) => res.json({data : req.user})) //testin purpose
router.get('/sendotp',authController.sendOTP)
router.put('/resetpassword',authMiddleware.authenticateToken,validationMiddleware.validateBody(validators.resetPasswordSchema),authController.resetPassword)
router.get("/google",passport.authenticate("google", { scope: ["profile", "email"] })) //call this endpoint for google login
router.get("/google/callback",passport.authenticate("google", { session: false }),authController.googleRedirect)

module.exports = router
