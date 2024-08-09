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
const leadPortal = require('./routes/leadPortal'); // amenities path
const PORT = process.env.PORT || 3000;
const app = express();
const bodyParser = require('body-parser');
const path = require('path');

// Serve static files from the "public" directory
app.use('/userimages', express.static(path.join(__dirname, '../public/userimages')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({
  origin: 'http://localhost:3032', // Replace with your frontend's origin
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  exposedHeaders: 'Content-Length,X-Kuma-Revision',
  credentials: true,
  maxAge: 600
}));

app.use(cors());
app.use(express.json());

// Use the auth routes for any requests starting with /auth
app.use('/auth', authRoutes);
app.use('/roles', rolePortal);
app.use('/amenities', amenitiesPortal);
app.use('/propertytype', propertypePortal);
app.use('/users', usersPortal);
app.use('/clients', clientsPortal);
app.use('/leads', leadPortal);

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
