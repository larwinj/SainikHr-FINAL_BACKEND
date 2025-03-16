const express = require('express')
const router = express.Router()
const corporateController = require('../controllers/corporateController')
const validationMiddleware = require('../middlewares/validationMiddleware')
const validator = require('../utils/validators')
const authMiddleware = require('../middlewares/authMiddleware')

router.put('/subscription',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard"),corporateController.subscription)

router.put('/profile/update',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard","corporate_enterprise"),validationMiddleware.validateBody(validator.cropProfileUpdateSchema),corporateController.profileUpdate)
router.put('/profile/match',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard","corporate_enterprise"),validationMiddleware.validateBody(validator.JobMatchSchema),corporateController.matchUserProfile) 
router.put('/profile/match/reject',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard","corporate_enterprise"),validationMiddleware.validateBody(validator.JobMatchSchema),corporateController.matchUserProfileReject) 

router.post('/jobcard/add',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard","corporate_enterprise"),validationMiddleware.validateBody(validator.jobCardSchema),corporateController.addJobCard)
router.get('/jobcards',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard","corporate_enterprise"),corporateController.getJobCards)
router.put('/jobcard/update/:id',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate_free","corporate_standard","corporate_enterprise"),validationMiddleware.validateBody(validator.jobCardSchema),corporateController.updateJobCard)

module.exports = router