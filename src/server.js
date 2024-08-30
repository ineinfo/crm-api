// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth'); // Auth path
const rolePortal = require('./routes/rolePortal'); // Role path
const usersPortal = require('./routes/usersPortal'); // User path
const clientsPortal = require('./routes/clientsPortal'); // User path
const amenitiesPortal = require('./routes/amenitiesPortal'); // amenities path
const propertypePortal = require('./routes/propertypePortal'); // amenities path
const propertiesPortal = require('./routes/propertiesPortal'); // amenities path
const leadPortal = require('./routes/leadPortal'); // amenities path
const countryPortal = require('./routes/countriesPortal'); // Country path
const statePortal = require('./routes/statesPortal'); // Country path

const PORT = process.env.PORT || 3000;
const app = express();
const bodyParser = require('body-parser');
const path = require('path');

// Serve static files from the "public" directory
app.use('/userimages', express.static(path.join(__dirname, '../public/userimages')));
app.use('/propertyimages', express.static(path.join(__dirname, '../public/propertyimages'))); // Add this line

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// app.use(cors({
//   origin: `${process.env.FRONTEND_URL}`,
//   methods: 'GET,POST,PUT,DELETE',
//   allowedHeaders: 'Content-Type,Authorization',
//   exposedHeaders: 'Content-Length,X-Kuma-Revision',
//   credentials: true,
//   maxAge: 600
// }));

// app.use(cors());

const allowedOrigins = [
  'http://crmfront.us-accuweb.cloud:3000',
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

// Use the auth routes for any requests starting with /auth
app.use('/auth', authRoutes);
app.use('/roles', rolePortal);
app.use('/amenities', amenitiesPortal);
app.use('/propertytype', propertypePortal);
app.use('/properties', propertiesPortal);
app.use('/users', usersPortal);
app.use('/clients', clientsPortal);
app.use('/leads', leadPortal);
app.use('/country', countryPortal);
app.use('/state', statePortal);


app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
