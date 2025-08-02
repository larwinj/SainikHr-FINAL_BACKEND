const express = require('express')
const router = express.Router()
const corporateController = require('../controllers/corporateController')
const authController = require('../controllers/authController')
const adminController = require('../controllers/adminController')
const validationMiddleware = require('../middlewares/validationMiddleware')
const validator = require('../utils/validators')
const authMiddleware = require('../middlewares/authMiddleware')
const restrictActions = require('../middlewares/restrictActions')

router.post('/register', authMiddleware.authenticateToken, validationMiddleware.validateBody(validator.registerSchemaCorporate), authController.signUp)
router.post('/login', validationMiddleware.validateBody(validator.loginSchema), authController.logIn)
router.delete('/account/delete', authMiddleware.authenticateToken, authController.deleteAccount)
router.get('/profile', authMiddleware.authenticateToken, authMiddleware.authorizeRoles("corporate"), corporateController.getProfile)
router.get('/findProfile', authMiddleware.authenticateToken, authMiddleware.authorizeRoles("corporate"), corporateController.searchVeterans)
router.put('/profile/update', authMiddleware.authenticateToken, validationMiddleware.validateBody(validator.profileUpdateCorporateSchema), corporateController.updateProfile)

router.get('/plan',adminController.getPlans)
router.put('/subscription',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate"),corporateController.subscription)

router.post('/job/post',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate"),restrictActions('jobPost'),validationMiddleware.validateBody(validator.jobSchema),corporateController.postOrUpdateJob)
router.put('/job/update',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate"),restrictActions('jobPost'),validationMiddleware.validateBody(validator.jobSchema),corporateController.postOrUpdateJob)
router.delete('/job/delete',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate","manageJobs"),corporateController.deletePostedJob)
router.get('/job',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('veteran','corporate','manageJobs'),corporateController.getJobs)

router.get('/resume',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate"),restrictActions('resumeView'),corporateController.getResume) 
router.put('/match',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate"),restrictActions('matchCandidatesEmailing'),corporateController.matchUserProfile) 
router.get('/application',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate"),restrictActions('matchCandidatesEmailing'),corporateController.getApplications) 
router.put('/request/video',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate"),restrictActions('profileVideoRequest'),corporateController.requestProfileVideo) 

router.post('/jobs/:jobId/view', authMiddleware.authenticateToken, corporateController.recordJobView);
// router.post('/jobs/:jobId/apply', authMiddleware.authenticateToken, corporateController.recordJobApplication);

router.post('/resume/download', authMiddleware.authenticateToken, corporateController.generateResumeEndpoint)

module.exports = router;
