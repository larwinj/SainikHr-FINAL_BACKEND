const jwt = require('jsonwebtoken')

const secretKey = process.env.SECRET_KEY

function JWTToken(userId,expiry = '1h') {
    return jwt.sign({ userId }, secretKey , { expiresIn: expiry })
}


module.exports = JWTToken
