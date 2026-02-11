const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// 🛡️ کلیلێ ل ڤێرێ بگۆهۆڕە بۆ هەر تشتەکێ تە بڤێت
const PRIVATE_KEY = '112233'; 

// 🗄️ گرێدان دگەل داتابەیسێ (بکارئینانا Environment Variables بۆ پاراستنا پاسوۆردی)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});

// 👮 سیستەمێ پشکنینا کلیلێ (Security Layer)
const authMiddleware = (req, res, next) => {
    const userKey = req.headers['authorization'];
    if (userKey === PRIVATE_KEY) {
        next();
    } else {
        res.status(401).json({ error: 'Access Denied: Invalid Key' });
    }
};

// --- API Routes ---

// وەرگرتنا لیستا نەخۆشان
app.get('/api/patients', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, age, phone, illness, 
            TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as date 
            FROM patients ORDER BY id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database Connection Error" });
    }
});

// تۆمارکرنا نەخۆشەکێ نوو
app.post('/api/patients', authMiddleware, async (req, res) => {
    const { name, age, phone, illness } = req.body;
    
    // پاراستن دژی داتایێ خەلەت
    if (!name || !age) return res.status(400).json({ error: "Name and Age are required" });

    try {
        await pool.query(
            'INSERT INTO patients (name, age, phone, illness) VALUES ($1, $2, $3, $4)',
            [name, age, phone, illness]
        );
        res.status(201).json({ message: "Patient saved safely" });
    } catch (err) {
        res.status(500).json({ error: "Failed to save data" });
    }
});

// نیشاندانا لاپەڕێ سەرەکی
app.use(express.static(__dirname));
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Secure Server is running on port ${PORT}`);
});
