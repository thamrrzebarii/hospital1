const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// 🛡️ کلیلێ ل ڤێرێ بگۆهۆڕە بۆ هەر تشتەکێ تە بڤێت
const PRIVATE_KEY = '112233'; 

// 🗄️ گرێدان دگەل داتابەیسێ
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

/**
 * ١. وەرگرتنی لیستا نەخۆشان
 * لێرەدا کاتەکە بە وردی وەردەگیرێت و ڕیزبەندی بەپێی نوێترین دەکرێت
 */
app.get('/api/patients', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, age, phone, illness, created_at,
            TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as date 
            FROM patients 
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching patients:", err);
        res.status(500).json({ error: "Database Connection Error" });
    }
});

/**
 * ٢. تۆمارکردنی نەخۆشێکی نوێ
 * گۆڕانکاری سەرەکی: کاتەکە بە کاتی کوردستان (Asia/Baghdad) پاشکەوت دەکرێت
 */
app.post('/api/patients', authMiddleware, async (req, res) => {
    const { name, age, phone, illness } = req.body;
    
    if (!name || !age) return res.status(400).json({ error: "Name and Age are required" });

    try {
        await pool.query(
            // لێرە کاتی کوردستان بەکاردێت لە جیاتی کاتی سێرڤەر
            "INSERT INTO patients (name, age, phone, illness, created_at) VALUES ($1, $2, $3, $4, timezone('Asia/Baghdad', now()))",
            [name, age, phone, illness]
        );
        res.status(201).json({ message: "Patient saved safely" });
    } catch (err) {
        console.error("Error saving patient:", err);
        res.status(500).json({ error: "Failed to save data" });
    }
});

/**
 * ٣. سڕینەوەی نەخۆش (Delete Patient)
 */
app.delete('/api/patients/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM patients WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json({ message: "Patient deleted successfully" });
    } catch (err) {
        console.error("Error deleting patient:", err);
        res.status(500).json({ error: "Failed to delete patient" });
    }
});

// --- Static Files Configuration ---

// نیشاندانی فایلی index.html و هەر فایلێکی تری ستاتیک
app.use(express.static(__dirname));

// ئەگەر بەکارهێنەر چوو بۆ هەر لینکێک کە هی API نەبێت، با فایلی سەرەکی ببینێت
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// دەستپێکردنی سێرڤەر
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Professional Secure Server is running on port ${PORT}`);
});