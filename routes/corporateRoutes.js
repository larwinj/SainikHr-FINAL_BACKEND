const express = require('express')
const router = express.Router()
const corporateController = require('../controllers/corporateController')
const authController = require('../controllers/authController')
const adminController = require('../controllers/adminController')
const validationMiddleware = require('../middlewares/validationMiddleware')
const validator = require('../utils/validators')
const authMiddleware = require('../middlewares/authMiddleware')

router.post('/register',authMiddleware.authenticateToken,validationMiddleware.validateBody(validator.registerSchemaCorporate),authController.signUp)
router.post('/login',validationMiddleware.validateBody(validator.loginSchema),authController.logIn)
router.delete('/deleteaccount',authMiddleware.authenticateToken,authController.deleteAccount)

router.get('/plan',adminController.getPlans)

//under this updation required
router.put('/subscription',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard"),corporateController.subscription)

router.put('/profile/update',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard","corporate_enterprise"),validationMiddleware.validateBody(validator.cropProfileUpdateSchema),corporateController.profileUpdate)
router.put('/profile/match' ,authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard","corporate_enterprise"),validationMiddleware.validateBody(validator.userProfileMatchSchema),corporateController.matchUserProfile) 
router.put('/profile/match/reject',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard","corporate_enterprise"),validationMiddleware.validateBody(validator.userProfileMatchSchema),corporateController.matchUserProfileReject) 

router.get('/matched/:jobId',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard","corporate_enterprise"),corporateController.getMatchedUsers) 

router.post('/jobcard/add',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard","corporate_enterprise"),validationMiddleware.validateBody(validator.jobCardSchema),corporateController.addJobCard)
router.get('/jobcards',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard","corporate_enterprise"),corporateController.getJobCards)
router.put('/jobcard/update/:id',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard","corporate_enterprise"),validationMiddleware.validateBody(validator.jobCardSchema),corporateController.updateJobCard)

module.exports = router