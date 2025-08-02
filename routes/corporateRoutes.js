const express = require('express')
const router = express.Router()
const corporateController = require('../controllers/corporateController')
const authController = require('../controllers/authController')
const adminController = require('../controllers/adminController')
const validationMiddleware = require('../middlewares/validationMiddleware')
const validator = require('../utils/validators')
const authMiddleware = require('../middlewares/authMiddleware')

router.post('/register', authMiddleware.authenticateToken, validationMiddleware.validateBody(validator.registerSchemaCorporate), authController.signUp)
router.post('/login', validationMiddleware.validateBody(validator.loginSchema), authController.logIn)
router.delete('/account/delete', authMiddleware.authenticateToken, authController.deleteAccount)
router.get('/profile', authMiddleware.authenticateToken, authMiddleware.authorizeRoles("corporate"), corporateController.getProfile)
router.get('/findProfile', authMiddleware.authenticateToken, authMiddleware.authorizeRoles("corporate"), corporateController.searchVeterans)
router.put('/profile/update', authMiddleware.authenticateToken, validationMiddleware.validateBody(validator.profileUpdateCorporateSchema), corporateController.updateProfile)

router.get('/plan', adminController.getPlans)
router.put('/subscription', authMiddleware.authenticateToken, corporateController.subscription)

router.post('/job/post', authMiddleware.authenticateToken, authMiddleware.authorizeRoles("jobPost"), validationMiddleware.validateBody(validator.jobSchema), corporateController.postOrUpdateJob)
router.put('/job/update', authMiddleware.authenticateToken, authMiddleware.authorizeRoles("jobPost"), validationMiddleware.validateBody(validator.jobSchema), corporateController.postOrUpdateJob)
router.delete('/job/delete', authMiddleware.authenticateToken, corporateController.deletePostedJob)
router.get('/job', authMiddleware.authenticateToken, corporateController.getJobs)

router.post('/jobs/:jobId/view', authMiddleware.authenticateToken, corporateController.recordJobView);
router.post('/jobs/:jobId/apply', authMiddleware.authenticateToken, corporateController.recordJobApplication);

router.get('/resume', authMiddleware.authenticateToken, authMiddleware.authorizeRoles("resume"), corporateController.getResume)
router.post('/resume/download', authMiddleware.authenticateToken, corporateController.generateResumeEndpoint)

router.put('/match', authMiddleware.authenticateToken, authMiddleware.authorizeRoles("corporate"), corporateController.matchUserProfile)
router.get('/application', authMiddleware.authenticateToken, authMiddleware.authorizeRoles("corporate"), corporateController.getApplications)
router.put('/request/video', authMiddleware.authenticateToken, authMiddleware.authorizeRoles("profileVideo"), corporateController.requestProfileVideo)

module.exports = router