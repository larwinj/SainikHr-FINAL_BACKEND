const Joi = require("joi")

const registerSchemaUser = Joi.object({
    fullName: Joi.string().min(3).max(30).required().messages({
        "string.empty": "fullName cannot be empty",
        "string.min": "fullName must be at least 3 characters",
        "string.max": "fullName must be atmost 30 characters",
        "any.required": "fullName is required",
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
    otp: Joi.string().length(6).required().messages({
        "string.empty": "OTP cannot be empty",
        "string.length": "OTP must be exactly 6 characters",
        "any.required": "OTP is required",
    }),   
    role: Joi.string().required().valid("veteran").messages({
        "string.empty": "Role cannot be empty",
        "any.only" : "Role is needed to be 'user'",
        "any.required": "Role is required",
    }),
})

const registerSchemaCorp = Joi.object({
    fullName:Joi.string().min(3).max(30).required().messages({
        "string.empty": "fullName cannot be empty",
        "string.min": "fullName must be at least 3 characters",
        "string.max": "fullName must be atmost 30 characters",
        "any.required": "fullName is required",
    }),
    email: Joi.string().email()
    .pattern(/^(?!.*@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)$).+@.+\..+$/)
    .required()
    .messages({
        "string.empty": "Email cannot be empty",
        "string.email": "Invalid email format",
        "any.required": "Email is required",
        "string.pattern.base": "Only company email addresses are allowed",
    }),
    password: Joi.string().min(6).required().messages({
        "string.empty": "Password cannot be empty",
        "string.min": "Password must be at least 6 characters",
        "any.required": "Password is required",
    }),
    otp: Joi.string().length(6).required().messages({
        "string.empty": "OTP cannot be empty",
        "string.length": "OTP must be exactly 6 characters",
        "any.required": "OTP is required",
    }),   
    role: Joi.string().required().valid("corporate").messages({
        "string.empty": "Role cannot be empty",
        "any.only": "Role is needed to be 'corp'",
        "any.required": "Role is required",
    }),
})
    
const cropProfileUpdateSchema = Joi.object({
    email: Joi.string()
        .email()
        .pattern(/^(?!.*@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)$).+@.+\..+$/)
        .required()
        .messages({
            "string.empty": "Email cannot be empty",
            "string.email": "Invalid email format",
            "any.required": "Email is required",
            "string.pattern.base": "Only company email addresses are allowed",
        }),

    companyName: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            "string.empty": "Company name cannot be empty",
            "string.min": "Company name must be at least 2 characters",
            "string.max": "Company name must be at most 100 characters",
            "any.required": "Company name is required",
        }),

    industryType: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
            "string.empty": "Industry type cannot be empty",
            "string.min": "Industry type must be at least 2 characters",
            "string.max": "Industry type must be at most 50 characters",
            "any.required": "Industry type is required",
        }),

    companySize: Joi.string()
        .required()
        .messages({
            "string.empty": "Company size cannot be empty",
            "any.required": "Company size is required",
        }),

    companyWebsite: Joi.string()
        .uri()
        .required()
        .messages({
            "string.empty": "Company website cannot be empty",
            "string.uri": "Invalid website URL format",
            "any.required": "Company website is required",
        }),

    headQuartersLocation: Joi.string()
        .required()
        .messages({
            "string.empty": "Headquarters location cannot be empty",
            "any.required": "Headquarters location is required",
        }),

    businessRegistrationNumber: Joi.alternatives()
        .try(
            Joi.string()
                .length(21)
                // .pattern(/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/) // CIN format
                .messages({
                    "string.length": "CIN must be exactly 21 characters",
                    // "string.pattern.base": "Invalid CIN format",
                }),
            Joi.string()
                .length(15)
                .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/) // GST format
                .messages({
                    "string.length": "GST must be exactly 15 characters",
                    "string.pattern.base": "Invalid GST Number format",
                }),
            Joi.string()
                .alphanum()
                .min(9)
                .max(15)
                .messages({
                    "string.alphanum": "Tax ID must be alphanumeric",
                    "string.min": "Tax ID must be at least 9 characters",
                    "string.max": "Tax ID must be at most 15 characters",
                })
        )
        .required()
        .messages({
            "any.required": "Business Registration Number (CIN, GST, or Tax ID) is required",
            "alternatives.match": "Provide a valid CIN, GST, or Tax ID",
        }),

    companyAddress: Joi.string()
        .min(5)
        .max(200)
        .required()
        .messages({
            "string.empty": "Company address cannot be empty",
            "string.min": "Company address must be at least 5 characters",
            "string.max": "Company address must be at most 200 characters",
            "any.required": "Company address is required",
        }),

    PrimaryRecruitersName: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            "string.empty": "Primary recruiter's name cannot be empty",
            "string.min": "Primary recruiter's name must be at least 2 characters",
            "string.max": "Primary recruiter's name must be at most 100 characters",
            "any.required": "Primary recruiter's name is required",
        }),

    jobRole: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            "string.empty": "Job role cannot be empty",
            "string.min": "Job role must be at least 2 characters",
            "string.max": "Job role must be at most 100 characters",
            "any.required": "Job role is required",
        }),

    jobDescription: Joi.string()
        .min(10)
        .max(1000)
        .required()
        .messages({
            "string.empty": "Job description cannot be empty",
            "string.min": "Job description must be at least 10 characters",
            "string.max": "Job description must be at most 1000 characters",
            "any.required": "Job description is required",
        }),

    phoneNumber: Joi.string()
        .pattern(/^[6-9]\d{9}$/)
        .messages({
            "string.empty": "Phone number cannot be empty",
            "string.pattern.base": "Invalid phone number format (must be 10 digits starting with 6-9)",
        }),

    landLineNumber: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .required()
        .messages({
            "string.empty": "Landline number cannot be empty",
            "string.pattern.base": "Landline number must be 10 digits",
            "any.required": "Landline number is required",
        }),

    linkedInProfile: Joi.string()
        .uri()
        .messages({
            "string.empty": "LinkedIn profile cannot be empty",
            "string.uri": "Invalid LinkedIn profile URL format",
        }),

    username: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            "string.empty": "Username cannot be empty",
            "string.min": "Username must be at least 3 characters",
            "string.max": "Username must be at most 100 characters",
            "any.required": "Username is required",
        }),

    password: Joi.string()
        .min(8)
        .max(30)
        .required()
        .messages({
            "string.empty": "Password cannot be empty",
            "string.min": "Password must be at least 8 characters",
            "string.max": "Password must be at most 30 characters",
            "any.required": "Password is required",
        }),

    subscriptionPlan: Joi.string()
        .valid("Basic", "Premium", "Enterprise")
        .required()
        .messages({
            "string.empty": "Subscription plan cannot be empty",
            "any.only": "Subscription plan must be one of 'Basic', 'Premium', or 'Enterprise'",
            "any.required": "Subscription plan is required",
        }),
}).unknown(true)

const loginSchemaUser = Joi.object({
    email: Joi.string().email().required().messages({
        "string.empty": "Email cannot be empty",
        "string.email": "Invalid email format",
        "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
        "string.empty": "Password cannot be empty",
        "string.min": "Password must be at least 6 characters",
        "any.required": "Password is required",
    }) 
})

//need to update 
const userProfileUpdateSchema = Joi.object({
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

const jobMatchSchema = Joi.object({
    corporateId: Joi.string().required().messages({
        "string.empty": "CorporateId cannot be empty",
        "any.required": "CorporateId is required",
    }),
    jobId: Joi.string().required().messages({
        "string.empty": "JobId cannot be empty",
        "any.required": "JobId is required",
    }),
})

const userProfileMatchSchema = Joi.object({
    userId: Joi.string().required().messages({
        "string.empty": "userId cannot be empty",
        "any.required": "userId is required",
    }),
    jobId: Joi.string().required().messages({
        "string.empty": "JobId cannot be empty",
        "any.required": "JobId is required",
    }),
})

const jobCardSchema = Joi.object({
    companyName: Joi.string().min(3).max(100).required().messages({
        'string.base': 'Company name must be a string.',
        'string.empty': 'Company name is required.',
        'string.min': 'Company name must be at least 3 characters long.',
        'string.max': 'Company name cannot exceed 100 characters.',
        'any.required': 'Company name is required.',
    }),

    email: Joi.string().email({ tlds: { allow: false } }).required().messages({
        'string.base': 'Email must be a string.',
        'string.email': 'Please provide a valid email address.',
        'string.empty': 'Email is required.',
        'any.required': 'Email is required.',
    }),

    contactPerson: Joi.object({
        name: Joi.string().min(3).max(50).required().messages({
            'string.base': 'Contact person name must be a string.',
            'string.empty': 'Contact person name is required.',
            'string.min': 'Contact person name must be at least 3 characters long.',
            'string.max': 'Contact person name cannot exceed 50 characters.',
            'any.required': 'Contact person name is required.',
        }),

        position: Joi.string().min(2).max(50).required().messages({
            'string.base': 'Position must be a string.',
            'string.empty': 'Position is required.',
            'string.min': 'Position must be at least 2 characters long.',
            'string.max': 'Position cannot exceed 50 characters.',
            'any.required': 'Position is required.',
        }),

        phone: Joi.string()
            .pattern(/^\+91-\d{10}$/)
            .required()
            .messages({
                'string.pattern.base': 'Phone number must follow the format +91-XXXXXXXXXX (e.g., +91-9876543210).',
                'string.empty': 'Phone number is required.',
                'any.required': 'Phone number is required.',
            })
    }).required().messages({
        'object.base': 'Contact person must be an object.',
        'any.required': 'Contact person details are required.',
    }),

    website: Joi.string().uri().required().messages({
        'string.base': 'Website must be a valid URL string.',
        'string.uri': 'Please provide a valid website URL.',
        'string.empty': 'Website is required.',
        'any.required': 'Website is required.',
    }),

    address: Joi.object({
        city: Joi.string().min(2).max(50).required().messages({
            'string.base': 'City must be a string.',
            'string.empty': 'City is required.',
            'string.min': 'City name must be at least 2 characters long.',
            'string.max': 'City name cannot exceed 50 characters.',
            'any.required': 'City is required.',
        }),

        state: Joi.string().required().messages({
            'string.base': 'State must be a string.',
            'string.empty': 'State is required.',
            'any.required': 'State is required.',
        }),
    }).required().messages({
        'object.base': 'Address must be an object.',
        'any.required': 'Address details are required.',
    }),

    industry: Joi.string().min(3).max(50).required().messages({
        'string.base': 'Industry must be a string.',
        'string.empty': 'Industry is required.',
        'string.min': 'Industry must be at least 3 characters long.',
        'string.max': 'Industry cannot exceed 50 characters.',
        'any.required': 'Industry is required.',
    }),

    companySize: Joi.string()
        .valid(
            '1-10 employees',
            '11-50 employees',
            '51-200 employees',
            '201-500 employees',
            '501-1000 employees',
            '1001+ employees'
        )
        .required()
        .messages({
            'any.only': 'Company size must be one of the predefined ranges.',
            'string.empty': 'Company size is required.',
            'any.required': 'Company size is required.',
        }),

    description: Joi.string().min(10).max(1000).required().messages({
        'string.base': 'Description must be a string.',
        'string.empty': 'Description is required.',
        'string.min': 'Description must be at least 10 characters long.',
        'string.max': 'Description cannot exceed 1000 characters.',
        'any.required': 'Description is required.',
    }),

    salaryRange: Joi.array()
        .length(2)
        .items(Joi.number().min(0).required())
        .required()
        .messages({
            'array.base': 'Salary range must be an array.',
            'array.length': 'Salary range must contain exactly two values: [min, max].',
            'number.base': 'Each salary value must be a number.',
            'number.min': 'Salary value must be at least 0.',
            'any.required': 'Salary range is required.',
        }),

    jobType: Joi.string()
        .valid('Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance')
        .required()
        .messages({
            'any.only': 'Job type must be one of Full-time, Part-time, Contract, Internship, or Freelance.',
            'string.empty': 'Job type is required.',
            'any.required': 'Job type is required.',
        }),

    requirements: Joi.array()
        .items(Joi.string().min(3).max(200))
        .required()
        .messages({
            'array.base': 'Requirements must be an array.',
            'array.includes': 'Each requirement must be a string.',
            'string.min': 'Each requirement must be at least 3 characters long.',
            'string.max': 'Each requirement cannot exceed 200 characters.',
            'any.required': 'Requirements are required.',
        }),
})



module.exports = { 
    registerSchemaUser,
    registerSchemaCorp,
    loginSchemaUser,
    nonEmptyBodySchema,
    resumeIdSchema,
    cropProfileUpdateSchema,
    jobCardSchema,
    jobMatchSchema,
    userProfileMatchSchema
};
