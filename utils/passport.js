const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const JWTToken = require('./jwtToken')
const { v4: uuidv4 } = require("uuid")
const dbModel = require("../models/dbModels")

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

passport.use(
    new GoogleStrategy(
        {
            clientID: googleClientId,
            clientSecret: googleClientSecret,
            callbackURL: "/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const usersCollection = await dbModel.getUsersCollection()
                let user = await usersCollection.findOne({ email: profile.emails[0].value })

                if (!user) {
                    const settings = {
                        emailNotification: false,
                        smsNotification: false,
                        darkMode: false
                    }

                    const newUser = {
                        userId : uuidv4(),
                        googleId: profile.id,
                        fullName: profile.displayName,
                        role : "veteran",
                        email: profile.emails[0].value,
                        profilePic: profile.photos[0].value,
                        settings,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                    await usersCollection.insertOne(newUser)
                    user = { ...newUser }
                }
                const token = JWTToken({ userId: user.userId, role: user.role },"1d")
                return done(null, { user, token })
            } catch (error) {
                return done(error, null)
            }
        }
    )
);

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((obj, done) => done(null, obj))

module.exports = passport;
