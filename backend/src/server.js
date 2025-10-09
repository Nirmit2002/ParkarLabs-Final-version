// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http'); // use http server so WebSocket can attach

// Import configurations and utilities
const { testConnection, closePool } = require('../config/database');
const { initWebsocket } = require('./services/websocket'); // new service

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // limit each IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: dbConnected ? 'Connected' : 'Disconnected',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user', require('./routes/user'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/containers', require('./routes/containers'));

// Added users routes (A1.3 update)
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown helpers
let shuttingDown = false;
const gracefulShutdown = async (signal, server) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down gracefully...`);

  try {
    // stop accepting new connections
    server.close(async (err) => {
      if (err) {
        console.error('Error closing HTTP server:', err);
        process.exit(1);
      }

      // close DB pool
      try {
        await closePool();
        console.log('Database pool closed.');
      } catch (dbErr) {
        console.error('Error closing DB pool:', dbErr);
      }

      console.log('Shutdown complete.');
      process.exit(0);
    });

    // force exit after a timeout if shutdown hangs
    setTimeout(() => {
      console.warn('Forcing shutdown after timeout.');
      process.exit(1);
    }, parseInt(process.env.SHUTDOWN_TIMEOUT_MS, 10) || 30 * 1000);
  } catch (shutdownErr) {
    console.error('Error during graceful shutdown:', shutdownErr);
    process.exit(1);
  }
};

// Start server (use http server so WebSocket can attach)
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Cannot connect to database');
    }

    const server = http.createServer(app);

    // initialize websockets (may throw, it's ok)
    try {
      initWebsocket(server);
      console.log('WebSocket service initialized.');
    } catch (e) {
      console.warn('WebSocket init failed (continuing without WS):', e.message || e);
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 ParkarLabs Backend Server Started!`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 Server: http://0.0.0.0:${PORT}`);
      console.log(`💾 Database: ${process.env.PGDATABASE}`);
      console.log(`📊 Health: http://0.0.0.0:${PORT}/health`);
    });

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM", server));
    process.on("SIGINT", () => gracefulShutdown("SIGINT", server));

    server.on("error", (err) => {
      console.error("Server error:", err);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
