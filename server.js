require('dotenv').config();
require('./utils/passport');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require('passport');
const path = require('path'); // ✅ Needed for resolving dist folder

const veteranRoutes = require('./routes/veteranRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const corporateRoutes = require('./routes/corporateRoutes');
const planAccessCache = require('./utils/planAccessCache');
const { sequelize } = require('./utils/db');

require('./models');

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
};

const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(passport.initialize());

// ✅ Serve Vite's build folder
app.use(express.static(path.join(__dirname, 'dist')));

// ✅ API routes
app.use('/backend/veteran', veteranRoutes);
app.use('/backend/corporate', corporateRoutes);
app.use('/backend/admin', adminRoutes);
app.use('/backend/auth', authRoutes);

// ✅ Catch-all for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3060;

(async () => {
  try {
    await sequelize.sync({ alter: false });
    console.log('✅ All models synced successfully.');

    await planAccessCache.loadCorporatePlans();

    app.listen(PORT, () => {
      console.log(`🚀 Listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Startup error:', err);
  }
})();
