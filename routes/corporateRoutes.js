const express = require('express')
const router = express.Router()
const corporateController = require('../controllers/corporateController')
const validationMiddleware = require('../middlewares/validationMiddleware')
const validator = require('../utils/validators')
const authMiddleware = require('../middlewares/authMiddleware')

router.put('/subscription',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate"),validationMiddleware.validateBody(validator.cropProfileUpdateSchema),corporateController.profileUpdate)
router.put('/profile/update',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate"),validationMiddleware.validateBody(validator.cropProfileUpdateSchema),corporateController.profileUpdate)
router.post('/jobcard/add',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate"),validationMiddleware.validateBody(validator.jobCardSchema),corporateController.addJobCard)
router.put('/jobcard/update/:id',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate"),validationMiddleware.validateBody(validator.jobCardSchema),corporateController.updateJobCard)
router.get('/jobcards',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate"),corporateController.getJobCards)

module.exports = router