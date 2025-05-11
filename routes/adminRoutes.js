const express = require("express")
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const authController = require("../controllers/authController")
const adminController = require('../controllers/adminController')
const validationMiddleware = require('../middlewares/validationMiddleware')
const validator = require('../utils/validators')

router.post('/createadmin',validationMiddleware.validateBody(validator.registerSchemaAdmin),authController.signUp)
router.post('/login',validationMiddleware.validateBody(validator.loginSchema),authController.logIn)
router.delete('/deleteaccount',authMiddleware.authenticateToken,authController.deleteAccount)

router.post('/plan/create',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('managePlans'),validationMiddleware.validateBody(validator.corporatePlanSchema),adminController.createOrUpdatePlan)
router.put('/plan/update',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('managePlans'),validationMiddleware.validateBody(validator.corporatePlanSchema),adminController.createOrUpdatePlan)
router.delete('/plan/delete',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('managePlans'),adminController.deletePlan)
router.get('/plan',authMiddleware.authenticateToken,adminController.getPlans)


module.exports = router
