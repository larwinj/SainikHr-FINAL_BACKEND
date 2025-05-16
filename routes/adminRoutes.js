const express = require("express")
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const authController = require("../controllers/authController")
const corporateController = require('../controllers/corporateController')
const adminController = require('../controllers/adminController')
const validationMiddleware = require('../middlewares/validationMiddleware')
const validator = require('../utils/validators')

router.post('/createadmin',validationMiddleware.validateBody(validator.registerSchemaAdmin),authController.signUp)
router.post('/login',validationMiddleware.validateBody(validator.loginSchema),authController.logIn)
router.delete('/account/delete',authMiddleware.authenticateToken,authController.deleteAccount)
router.put('/profile/update',authMiddleware.authenticateToken,validationMiddleware.validateBody(validator.profileUpdateSchema),corporateController.updateProfile)

router.post('/plan/create',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('managePlans'),validationMiddleware.validateBody(validator.corporatePlanSchema),adminController.createOrUpdatePlan)
router.put('/plan/update',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('managePlans'),validationMiddleware.validateBody(validator.corporatePlanSchema),adminController.createOrUpdatePlan)
router.delete('/plan/delete',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('managePlans'),adminController.deletePlan)
router.get('/plan',authMiddleware.authenticateToken,adminController.getPlans)

router.post('/job/post',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("manageJobs"),validationMiddleware.validateBody(validator.jobSchema),corporateController.postOrUpdateJob)
router.put('/job/update',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("manageJobs"),validationMiddleware.validateBody(validator.jobSchema),corporateController.postOrUpdateJob)
router.delete('/job/delete',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("manageJobs"),corporateController.deletePostedJob)
router.get('/job',authMiddleware.authenticateToken,corporateController.getJobs)

router.delete('/profile/delete',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('manageUsers'),authController.deleteAccount)
router.delete('/resume',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('manageUsers'),corporateController.getResume)
router.get('/profile',authMiddleware.authenticateToken,adminController.fetchUserProfiles)

router.put('/profile/verify',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('verifyCorporates'),adminController.verifyCorporate)

router.put('/access',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('manageAdmins'),validationMiddleware.validateBody(validator.roleAccessSchema),adminController.updateAdminAccess)
router.delete('/delete',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('manageAdmins'),adminController.deleteAdminAccount)

module.exports = router
