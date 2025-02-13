const bcrypt = require("bcryptjs");

async function hashPassword(password) {
    const saltRounds = 10; 
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

async function verifyPassword(enteredPassword, storedHash) {
    const isMatch = await bcrypt.compare(enteredPassword, storedHash);
    return isMatch;
}

module.exports = {
    hashPassword,
    verifyPassword
}




