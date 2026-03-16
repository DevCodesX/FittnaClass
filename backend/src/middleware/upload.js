const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');

// Receipt Upload
const receiptDir = path.join(__dirname, '..', '..', env.upload.dir, 'receipts');
if (!fs.existsSync(receiptDir)) {
    fs.mkdirSync(receiptDir, { recursive: true });
}

const receiptStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, receiptDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `receipt-${uniqueSuffix}${ext}`);
    },
});

const receiptFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/pdf',
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.'), false);
    }
};

const uploadReceipt = multer({
    storage: receiptStorage,
    fileFilter: receiptFilter,
    limits: {
        fileSize: env.upload.maxFileSize,
    },
});

// Video Upload (local disk storage)
const videoDir = path.join(__dirname, '..', '..', env.upload.dir, 'videos');
if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
}

const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, videoDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `video-${uniqueSuffix}${ext}`);
    },
});

const videoFilter = (req, file, cb) => {
    const allowedTypes = [
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only MP4, MOV, AVI, and WebM video files are allowed.'), false);
    }
};

const uploadVideo = multer({
    storage: videoStorage,
    fileFilter: videoFilter,
    limits: {
        fileSize: env.upload.maxVideoFileSize,
    },
});

module.exports = { uploadReceipt, uploadVideo };
