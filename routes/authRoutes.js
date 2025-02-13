const express = require("express")
const passport = require("passport")
const router = express.Router()
const tokenAuthMiddleware = require('../middlewares/tokenAuthMiddleware')

router.get('/jwt',tokenAuthMiddleware,(req,res) => res.json({data : req.user}))
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }))
router.get(
    "/google/callback",
    passport.authenticate("google", { session: false }),
    (req, res) => {
        res.json({ message: "OAuth Login Successful", token: req.user.token })
    }
)

module.exports = router
