const Joi = require("joi");

const registerSchema = Joi.object({
    name: Joi.string().min(3).max(30).required().messages({
        "string.empty": "Name cannot be empty",
        "string.min": "Name must be at least 3 characters",
        "any.required": "Name is required",
    }),
    email: Joi.string().email().required().messages({
        "string.empty": "Email cannot be empty",
        "string.email": "Invalid email format",
        "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
        "string.empty": "Password cannot be empty",
        "string.min": "Password must be at least 6 characters",
        "any.required": "Password is required",
    }),
    role: Joi.string().required().messages({
        "string.empty": "Role cannot be empty",
        "any.required": "Role is required",
    }),
})

const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.empty": "Email cannot be empty",
        "string.email": "Invalid email format",
        "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
        "string.empty": "Password cannot be empty",
        "string.min": "Password must be at least 6 characters",
        "any.required": "Password is required",
    }),
})

const nonEmptyBodySchema = Joi.object().min(1).messages({
    "object.min": "Request body cannot be empty",
})

const resumeIdSchema = Joi.object({
    resumeId: Joi.string().required().messages({
        "string.empty": "ResumeId cannot be empty",
        "any.required": "ResumeId is required",
    }),
}).unknown(true)

module.exports = { 
    registerSchema,
    loginSchema,
    nonEmptyBodySchema,
    resumeIdSchema
};
