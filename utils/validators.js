const Joi = require("joi")

const registerSchemaVeteran = Joi.object({
    userName: Joi.string().min(3).max(30).required().messages({
        "string.empty": "UserName cannot be empty",
        "string.min": "UserName must be at least 3 characters",
        "string.max": "UserName must be atmost 30 characters",
        "any.required": "UserName is required",
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
        "any.only" : "Role is needed to be 'veteran'",
        "any.required": "Role is required",
    }),
})

const registerSchemaCorporate = Joi.object({
    userName:Joi.string().min(3).max(30).required().messages({
        "string.empty": "UserName cannot be empty",
        "string.min": "UserName must be at least 3 characters",
        "string.max": "UserName must be atmost 30 characters",
        "any.required": "UserName is required",
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
        "any.only": "Role is needed to be 'corporate'",
        "any.required": "Role is required",
    }),
    companyName: Joi.string().required().messages({
        "string.empty": "Company Name cannot be empty",
        "any.required": "Company Name is required",
    }),
})

const registerSchemaAdmin = Joi.object({
    userName:Joi.string().min(3).max(30).required().messages({
        "string.empty": "UserName cannot be empty",
        "string.min": "UserName must be at least 3 characters",
        "string.max": "UserName must be atmost 30 characters",
        "any.required": "UserName is required",
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
    role: Joi.string().required().valid("admin").messages({
        "string.empty": "Role cannot be empty",
        "any.only": "Role is needed to be 'admin'",
        "any.required": "Role is required",
    }),
    roleName: Joi.string().required().messages({
        "string.empty": "Rolename cannot be empty",
        "any.required": "Rolename is required",
    }),
    manageAdmins: Joi.boolean().required().messages({
        'boolean.base': 'manageAdmins must be a boolean value.',
        'any.required': 'manageAdmins is required.'
    }),
    manageUsers: Joi.boolean().required().messages({
        'boolean.base': 'manageUsers must be a boolean value.',
        'any.required': 'manageUsers is required.'
    }),
    verifyCorporates: Joi.boolean().required().messages({
        'boolean.base': 'verifyCorporates must be a boolean value.',
        'any.required': 'verifyCorporates is required.'
    }),
    manageJobs: Joi.boolean().required().messages({
        'boolean.base': 'manageJobs must be a boolean value.',
        'any.required': 'manageJobs is required.'
    }),
    financialManagement:Joi.boolean().required().messages({
        'boolean.base': 'financialManagement must be a boolean value.',
        'any.required': 'financialManagement is required.'
    }),
    managePlans: Joi.boolean().required().messages({
        'boolean.base': 'managePlans must be a boolean value.',
        'any.required': 'managePlans is required.'
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
    }) 
})

const resetPasswordSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.empty": "Email cannot be empty",
        "string.email": "Invalid email format",
        "any.required": "Email is required",
    }),
    otp: Joi.string().length(6).required().messages({
        "string.empty": "OTP cannot be empty",
        "string.length": "OTP must be exactly 6 characters",
        "any.required": "OTP is required",
    }),  
    password: Joi.string().required().messages({
        "string.empty": "Password cannot be empty",
        "any.required": "Password is required",
    }) 
})

const corporatePlanSchema = Joi.object({
    planName: Joi.string().required().messages({
        "string.base": "Plan name must be a string",
        "string.empty": "Plan name cannot be empty",
        "any.required": "Plan name is required"
    }),
    access: Joi.object({
        profileVideo: Joi.boolean().required().messages({
            "boolean.base": "Profile video must be a boolean",
            "any.required": "Profile video access is required"
        }),
        profileVideoCountLimit: Joi.number().integer().min(0).required().messages({
            "number.base": "Profile video count limit must be a number",
            "number.integer": "Profile video count limit must be an integer",
            "number.min": "Profile video count limit cannot be negative",
            "any.required": "Profile video count limit is required"
        }),
        resume: Joi.boolean().required().messages({
            "boolean.base": "Resume access must be a boolean",
            "any.required": "Resume access is required"
        }),
        resumeCountLimit: Joi.number().integer().min(0).required().messages({
            "number.base": "Resume count limit must be a number",
            "number.integer": "Resume count limit must be an integer",
            "number.min": "Resume count limit cannot be negative",
            "any.required": "Resume count limit is required"
        }),
        jobPost: Joi.boolean().required().messages({
            "boolean.base": "Job post access must be a boolean",
            "any.required": "Job post access is required"
        }),
        jobPostCountLimit: Joi.number().integer().min(0).required().messages({
            "number.base": "Job post count limit must be a number",
            "number.integer": "Job post count limit must be an integer",
            "number.min": "Job post count limit cannot be negative",
            "any.required": "Job post count limit is required"
        }),
    }).required().messages({
        "object.base": "Access must be an object",
        "any.required": "Access section is required"
    }),
    duration: Joi.object({
        value: Joi.number().positive().required().messages({
            "number.base": "Duration value must be a number",
            "number.positive": "Duration value must be greater than 0",
            "any.required": "Duration value is required"
        }),
        unit: Joi.string().valid("days", "weeks", "months", "years").required().messages({
            "any.only": "Duration unit must be one of 'days', 'weeks', 'months', or 'years'",
            "any.required": "Duration unit is required"
        }),
    }).required().messages({
        "object.base": "Duration must be an object",
        "any.required": "Duration section is required"
    }),
    cost: Joi.object({
        rate: Joi.number().positive().required().messages({
            "number.base": "Cost rate must be a number",
            "number.positive": "Cost rate must be greater than 0",
            "any.required": "Cost rate is required"
        }),
        currency: Joi.string().length(3).uppercase().required().messages({
            "string.base": "Currency must be a string",
            "string.length": "Currency must be exactly 3 uppercase letters (ISO code)",
            "string.uppercase": "Currency must be in uppercase",
            "any.required": "Currency is required"
        }),
    }).required().messages({
        "object.base": "Cost must be an object",
        "any.required": "Cost section is required"
    })
})

const jobSchema = Joi.object({

    role: Joi.string().min(3).max(100).required().messages({
        'string.base': 'Role must be a string.',
        'string.empty': 'Role is required.',
        'string.min': 'Role must be at least 3 characters long.',
        'string.max': 'Role cannot exceed 100 characters.',
        'any.required': 'Role is required.',
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

const profileUpdateSchema = Joi.object({
    userName: Joi.string().min(3).max(30).required().messages({
        'string.base': 'Username must be a string.',
        'string.empty': 'Username is required.',
        'string.min': 'Username must be at least 3 characters long.',
        'string.max': 'Username cannot exceed 30 characters.',
        'any.required': 'Username is required.'
    }),

    name: Joi.object({
        firstName: Joi.string().min(1).max(50).required().messages({
            'string.base': 'First name must be a string.',
            'string.empty': 'First name is required.',
            'string.min': 'First name must be at least 1 character.',
            'string.max': 'First name cannot exceed 50 characters.',
            'any.required': 'First name is required.'
        }),
        middleName: Joi.string().max(50).optional().allow('').messages({
            'string.base': 'Middle name must be a string.',
            'string.max': 'Middle name cannot exceed 50 characters.'
        }),
        lastName: Joi.string().min(1).max(50).required().messages({
            'string.base': 'Last name must be a string.',
            'string.empty': 'Last name is required.',
            'string.min': 'Last name must be at least 1 character.',
            'string.max': 'Last name cannot exceed 50 characters.',
            'any.required': 'Last name is required.'
        }),
    }).required().messages({
        'object.base': 'Name must be an object.',
        'any.required': 'Name is required.'
    })
})

const resumeSchema = Joi.object({
    title: Joi.string().min(2).max(100).required(),
    
    contact: Joi.object({
        phone: Joi.string()
        .pattern(/^\+?\d{10,15}$/)
        .required()
        .messages({
            'string.pattern.base': 'Phone must be a valid number with 10 to 15 digits.',
        }),
        email: Joi.string().email({ tlds: { allow: false } }).required(),
        location: Joi.string().min(2).max(100).required(),
        pincode: Joi.string()
        .pattern(/^\d{4,10}$/)
        .required()
        .messages({
            'string.pattern.base': 'Pincode must be between 4 and 10 digits.',
        }),
        linkedin: Joi.string().uri().required(),
        github: Joi.string().uri().required()
    }).required(),
    
    profile: Joi.string().min(10).max(1000).required(),
    
    education: Joi.array().items(
        Joi.object({
            years: Joi.string().required(),
            institution: Joi.string().min(2).max(100).required(),
            degree: Joi.string().min(2).max(100).required(),
            percentage: Joi.string().pattern(/^\d{1,3}(\.\d{1,2})?%?$/).required()
        })
    ).min(1).required(),
    
    skills: Joi.array().items(
        Joi.string().min(1).max(50)
    ).min(1).required(),
    
    languages: Joi.array().items(
        Joi.string().min(1).max(50)
    ).min(1).required(),
    
    workExperience: Joi.array().items(
        Joi.object({
            company: Joi.string().min(2).max(100).required(),
            role: Joi.string().min(2).max(100).required(),
            duration: Joi.string().min(2).max(100).required(),
            responsibilities: Joi.array().items(
                Joi.string().min(5).max(300)
            ).min(1).required()
        })
    ).min(0).required(),
    
    projects: Joi.array().items(
        Joi.object({
            title: Joi.string().min(2).max(100).required(),
            role: Joi.string().min(2).max(100).required(),
            year: Joi.string().pattern(/^\d{4}$/).required(),
            description: Joi.string().min(10).max(1000).required()
        })
    ).min(0).required()
})

const roleAccessSchema = Joi.object({
  roleName: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.base': 'Role name must be a string.',
      'string.empty': 'Role name is required.',
      'string.min': 'Role name must be at least 3 characters.',
      'string.max': 'Role name must not exceed 50 characters.',
      'any.required': 'Role name is required.'
    }),

  access: Joi.object({
    manageAdmins: Joi.boolean().required().messages({
      'boolean.base': 'manageAdmins must be a boolean.',
      'any.required': 'manageAdmins is required.'
    }),
    manageUsers: Joi.boolean().required().messages({
      'boolean.base': 'manageUsers must be a boolean.',
      'any.required': 'manageUsers is required.'
    }),
    verifyCorporates: Joi.boolean().required().messages({
      'boolean.base': 'verifyCorporates must be a boolean.',
      'any.required': 'verifyCorporates is required.'
    }),
    manageJobs: Joi.boolean().required().messages({
      'boolean.base': 'manageJobs must be a boolean.',
      'any.required': 'manageJobs is required.'
    }),
    financialManagement: Joi.boolean().required().messages({
      'boolean.base': 'financialManagement must be a boolean.',
      'any.required': 'financialManagement is required.'
    }),
    managePlans: Joi.boolean().required().messages({
      'boolean.base': 'managePlans must be a boolean.',
      'any.required': 'managePlans is required.'
    })
  }).required().messages({
    'object.base': 'Access must be an object.',
    'any.required': 'Access is required.'
  })
})


module.exports = { 
    registerSchemaVeteran,
    registerSchemaCorporate,
    registerSchemaAdmin,
    loginSchema,
    resetPasswordSchema,
    corporatePlanSchema,
    jobSchema,
    profileUpdateSchema,
    resumeSchema,
    roleAccessSchema,
};
