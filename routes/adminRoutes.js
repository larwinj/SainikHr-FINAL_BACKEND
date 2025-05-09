const express = require("express")
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const authController = require("../controllers/authController")
const validationMiddleware = require('../middlewares/validationMiddleware')
const validator = require('../utils/validators')

router.post('/createadmin',validationMiddleware.validateBody(validator.registerSchemaAdmin),authController.signUp)
router.post('/login',validationMiddleware.validateBody(validator.loginSchema),authController.logIn)
router.delete('/deleteaccount',authMiddleware.authenticateToken,authController.deleteAccount)

module.exports = router
