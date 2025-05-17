const express = require('express')
const router = express.Router()
const multer = require("multer")
const veteranController = require('../controllers/veteranController')
const validationMiddleware = require('../middlewares/validationMiddleware')
const validator = require('../utils/validators')
const authMiddleware = require('../middlewares/authMiddleware')
const authController = require('../controllers/authController')
const corporateController = require('../controllers/corporateController')

const upload = multer({ storage: multer.memoryStorage() });

router.post('/register',authMiddleware.authenticateToken,validationMiddleware.validateBody(validator.registerSchemaVeteran),authController.signUp)
router.post('/login',validationMiddleware.validateBody(validator.loginSchema),authController.logIn)
router.delete('/account/delete',authMiddleware.authenticateToken,authController.deleteAccount)
router.get('/profile',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),veteranController.getProfile)
router.put('/profile/update',authMiddleware.authenticateToken,validationMiddleware.validateBody(validator.profileUpdateSchema),corporateController.updateProfile)

router.get('/job',authMiddleware.authenticateToken,corporateController.getJobs)
router.get('/job/saved',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('veteran'),veteranController.getSavedJobs)
router.put('/job/save',authMiddleware.authenticateToken,authMiddleware.authorizeRoles('veteran'),veteranController.saveOrRemoveJob)
router.put('/job/match',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),veteranController.matchCorporateJob) 

router.get('/resume',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),corporateController.getResume)
router.post('/resume/create',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),validationMiddleware.validateBody(validator.resumeSchema),veteranController.createOrUpdateResume)
router.put('/resume/update',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),validationMiddleware.validateBody(validator.resumeSchema),veteranController.createOrUpdateResume)
router.delete('/resume/delete',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),veteranController.deleteResume)

router.get('/application',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("corporate"),corporateController.getApplications) 
router.post('/request/video/accept',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),upload.single('video'),veteranController.acceptRequestAndUploadVideo)
router.put('/request/video/reject',authMiddleware.authenticateToken,authMiddleware.authorizeRoles("veteran"),veteranController.rejectRequest)

module.exports = router