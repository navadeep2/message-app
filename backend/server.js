require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const { authenticateJWT } = require('./middleware/authMiddleware');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for frontend

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', authenticateJWT, messageRoutes);

// Serve frontend static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Catch-all route to serve frontend html (for SPA routing fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
