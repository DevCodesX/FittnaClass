const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { errorHandler } = require('./middleware/errorHandler');
const env = require('./config/env');

// Import routes

// Import routes
const authRoutes = require('./routes/auth.routes');
const instructorRoutes = require('./routes/instructor.routes');
const studentRoutes = require('./routes/student.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// ─── Security & Parsing ────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
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

// Ingress debugging middleware
if (env.nodeEnv === 'development') {
    app.use(express.json({
        verify: (req, res, buf) => {
            req.rawBody = buf;
        }
    }));
    app.use((req, res, next) => {
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const rawBodyStr = req.rawBody ? req.rawBody.toString('utf8') : '';
            console.log(`[Ingress] ${req.method} ${req.originalUrl} | Content-Type: ${req.headers['content-type']}`);
            console.log(`[Ingress] Raw Body: ${rawBodyStr}`);
        }
        next();
    });
} else {
    app.use(express.json());
}
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
app.use('/api/instructor', adminRoutes);
app.use('/api/Teacher', instructorRoutes);
app.use('/api/Teacher', adminRoutes);
app.use('/api', studentRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Public Invite Routes (no instructor role required) ────────
const { authenticate } = require('./middleware/auth');
const adminController = require('./controllers/admin.controller');
app.get('/api/invite/:token', adminController.verifyInviteToken);
app.post('/api/invite/:token/accept', authenticate, adminController.acceptInviteByToken);

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
