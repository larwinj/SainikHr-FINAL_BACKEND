const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { v4: uuidv4 } = require("uuid");
const JWTToken = require("./jwtToken");

const { User } = require("../models"); // Sequelize User model

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

passport.use(
  new GoogleStrategy(
    {
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("Email not provided by Google"), null);
        }

        let user = await User.findOne({ where: { email } });

        if (!user) {
          user = await User.create({
            userId: uuidv4(),
            username: profile.displayName,
            firstName: profile.name?.givenName || profile.displayName,
            middleName: null,
            lastName: profile.name?.familyName || null,
            email,
            passwordHash: null,
            role: "veteran",
            preferences: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        const token = JWTToken({ userId: user.userId, role: user.role }, "1d");
        return done(null, { user, token });

      } catch (error) {
        console.error("Google OAuth error:", error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

module.exports = passport;
