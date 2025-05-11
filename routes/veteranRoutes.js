const express = require('express')
const router = express.Router()
const multer = require("multer")
const userController = require('../controllers/veteranController')
const validationMiddleware = require('../middlewares/validationMiddleware')
const validator = require('../utils/validators')
const authMiddleware = require('../middlewares/authMiddleware')
const authController = require('../controllers/authController')

const upload = multer({ storage: multer.memoryStorage() });

router.post('/register',authMiddleware.authenticateToken,validationMiddleware.validateBody(validator.registerSchemaVeteran),authController.signUp)
router.post('/login',validationMiddleware.validateBody(validator.loginSchema),authController.logIn)
router.delete('/deleteaccount',authMiddleware.authenticateToken,authController.deleteAccount)

//under this updation required
router.put('/profile/update',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"))
router.get('/profile',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),userController.getProfile)
router.post('/profile/video/upload',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),upload.single('video'),userController.uploadProfileVideo)
router.delete('/profile/video/delete',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),userController.deleteProfileVideo)
router.get('/profile/video/:userId?',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran","corporate_enterprise"),userController.getProfileVideo)
router.put('/profile/match',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),validationMiddleware.validateBody(validator.jobMatchSchema),userController.matchJob) 

router.post('/resume/create',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),validationMiddleware.validateBody(validator.nonEmptyBodySchema),userController.createResume)
router.put('/resume/update',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),validationMiddleware.validateBody(validator.resumeIdSchema),userController.updateResume)
router.delete('/resume/remove',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),validationMiddleware.validateBody(validator.resumeIdSchema),userController.deleteResume)
router.get('/resume/:resumeId?',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran","corporate_free"),userController.getResume)

router.get('/jobcards',authMiddleware.authenticateToken,userController.getJobCards)
router.put('/job/save/:jobId?',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),userController.saveJob)
router.delete('/job/remove/:jobId?',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),userController.removeSavedJob)
router.get('/job/saved/view',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),userController.getSavedJobs)

module.exports = router