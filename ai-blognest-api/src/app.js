const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { notFound, errorHandler } = require('./middlewares/errorMiddleware');
const { isDbConnected } = require('./config/db');
const { getGeminiClient } = require('./config/ai');

// Import routes
const authRoutes = require('./routes/authRoutes');
const blogRoutes = require('./routes/blogRoutes');
const commentRoutes = require('./routes/commentRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows public demo page to run smoothly
    crossOriginEmbedderPolicy: false,
  })
);

// CORS Setup
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',')
  : ['*'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

// Request Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests created from this IP, please try again after 15 minutes.',
  },
});
app.use('/api', apiLimiter);

// Serve static real-time test playground
app.use(express.static(path.join(__dirname, '../public')));

// Root & Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'AI BlogNest API',
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    features: {
      mongoDatabase: isDbConnected() ? 'Connected' : 'Fallback In-Memory Store Active',
      googleGeminiAI: getGeminiClient() ? 'Live Google Gemini Key Configured' : 'Simulation Fallback Mode',
      realTimeSocket: 'Active (Socket.io)',
    },
    endpoints: {
      auth: '/api/auth (register, login, profile)',
      blogs: '/api/blogs (CRUD, search, like, filter)',
      comments: '/api/comments (live discussion)',
      ai: '/api/ai (generate-blog, summarize, generate-titles)',
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/ai', aiRoutes);

// Fallback for SPA/UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
