const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const validationMiddleware = require('../middlewares/validationMiddleware')
const validator = require('../utils/validators')
const authMiddleware = require('../middlewares/authMiddleware')

router.post('/register',validationMiddleware.validateBody(validator.registerSchema),userController.signUp)
router.post('/login',validationMiddleware.validateBody(validator.loginSchema),userController.logIn)
router.post('/resume/create',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("user"),validationMiddleware.validateBody(validator.nonEmptyBodySchema),userController.createResume)
router.put('/resume/update',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("user"),validationMiddleware.validateBody(validator.resumeIdSchema),userController.updateResume)
router.delete('/resume/remove',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("user"),validationMiddleware.validateBody(validator.resumeIdSchema),userController.deleteResume)
router.get('/resume/:resumeId',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("user"),userController.getResume)

module.exports = router