const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { errorHandler } = require('./middleware/errorHandler');
const env = require('./config/env');

// Import routes
const authRoutes = require('./routes/auth.routes');
const instructorRoutes = require('./routes/instructor.routes');
const studentRoutes = require('./routes/student.routes');

const app = express();

// ─── Security & Parsing ────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (env.allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static Files (uploaded receipts) ──────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Health Check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'FittnaClass API is running',
        timestamp: new Date().toISOString(),
    });
});

// ─── API Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api', studentRoutes);

// ─── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found.`,
    });
});

// ─── Global Error Handler ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
