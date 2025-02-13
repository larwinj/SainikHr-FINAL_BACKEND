const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const validationMiddleware = require('../middlewares/validationMiddleware')
const validator = require('../utils/validators')

router.post('/register',validationMiddleware.validateBody(validator.registerSchema),userController.signUp)

module.exports = router