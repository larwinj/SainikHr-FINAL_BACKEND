const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const validationMiddleware = require('../middlewares/validationMiddleware')
const validator = require('../utils/validators')
const authMiddleware = require('../middlewares/authMiddleware')
const corporateController = require('../controllers/corporateController')

router.post('/register',
    authMiddleware.authenticateToken,
    (req, res, next) => {
        const schema = req.body?.role === "veteran" ? validator.registerSchemaUser : validator.registerSchemaCorp
        validationMiddleware.validateBody(schema)(req, res, next)
    },
    userController.signUp
)
router.post('/login',validationMiddleware.validateBody(validator.loginSchemaUser),userController.logIn)
router.put('/profile/update',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"))//under construction
router.post('/resume/create',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),validationMiddleware.validateBody(validator.nonEmptyBodySchema),userController.createResume)
router.put('/resume/update',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),validationMiddleware.validateBody(validator.resumeIdSchema),userController.updateResume)
router.delete('/resume/remove',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),validationMiddleware.validateBody(validator.resumeIdSchema),userController.deleteResume)
router.get('/resume/:resumeId?',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),userController.getResume)
router.get('/jobcards',authMiddleware.authenticateToken,corporateController.getJobCards)
router.put('/job/save/:jobId?',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),userController.saveJob)
router.delete('/job/remove/:jobId?',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),userController.removeSavedJob)
router.get('/job/view',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),userController.getSavedJobs)

module.exports = router