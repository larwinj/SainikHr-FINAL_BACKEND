function validateBody(schema) {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false })
        if (error) {
            return res.status(400).json({
                message: "Validation Failed",
                errors: error.details.map((err) => err.message),
            })
        }
        next()
    }
}

const validateParams = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.params, { abortEarly: false })
    if (error) {
        return res.status(400).json({
            message: "Invalid parameters",
            errors: error.details.map((err) => err.message),
        })
    }
    next()
}

const validateQuery = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false })
    if (error) {
        return res.status(400).json({
            message: "Invalid query parameters",
            errors: error.details.map((err) => err.message),
        })
    }
    req.query = value
    next()
}

module.exports = { 
    validateBody,
    validateParams,
    validateQuery
}
