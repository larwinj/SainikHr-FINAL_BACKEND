// const { Sequelize } = require('sequelize');
// require('dotenv').config();

// const sequelize = new Sequelize(
//   process.env.DB_NAME,       // database name
//   process.env.DB_USER,       // username
//   process.env.DB_PASSWORD,   // password
//   {
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT || 3306,
//     dialect: process.env.DB_DIALECT || 'mysql',
//     logging: false,          // Set to true if you want to see SQL logs
//     dialectOptions: {
//       connectTimeout: 10000  // Optional: increase timeout for remote connection
//     }
//   }
// );

// module.exports = { sequelize };

// ------------------------------------------------------------------------------------
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('sainikhr', 'root', 'Rooban@6362', {
  host: 'localhost',
  dialect: 'mysql',
  // logging: false,
});
require('../models'); 
module.exports = { sequelize };

