const jwt = require('jsonwebtoken')

const secretKey = process.env.SECRET_KEY

function JWTToken(data,expiry = '1h') {
    return jwt.sign({ ...data }, secretKey , { expiresIn: expiry })
}


module.exports = JWTToken
