require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./socket/socketHandler');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Setup Real-time WebSockets with Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Initialize socket handlers
initSocket(io);

// Start server function
const startServer = async () => {
  // Connect Database (with non-blocking fallback)
  await connectDB();

  server.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 AI BlogNest API Server is running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`⚡ Real-time Socket.io active on port: ${PORT}`);
    console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('====================================================');
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection Error]: ${err.message}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`[Uncaught Exception Error]: ${err.message}`);
});

startServer();
