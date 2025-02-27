require('dotenv').config()
require("./utils/passport")
const express = require('express')
const cors = require('cors')

const bodyParser = require('body-parser')
const userRoutes = require('./routes/userRoutes')
const authRoutes = require('./routes/authRoutes')
const corporateRoutes = require('./routes/corporateRoutes')
const passport = require("passport")

const corsOptions = {
    // origin: 'http://192.168.243.154:5173',
    origin: '*',
    methods: ['GET', 'POST', 'PUT' ,'DELETE' ],
}

const app = express()

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(passport.initialize())

app.use("/veteran", userRoutes)
app.use("/corporate", corporateRoutes)
app.use("/auth", authRoutes)

const PORT = process.env.PORT || 3060

app.listen(PORT, () => {
    console.log(`Listening to the port ${PORT}...`)
});