const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();

// --- Middlewares ---
app.use(express.json());
app.use(cors());

// --- 1. گرێدان ب داتابەیسا Supabase (وەشانێ Vercel) ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // بۆ ئەوەی کێشەی SSL دروست نەبێت لە Vercel
    }
});

// --- 2. API Routes ---

// GET: ئینانا هەمی نەخۆشان
app.get('/api/patients', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, age, phone, illness, 
            TO_CHAR(created_at, 'DD/MM/YYYY') as date 
            FROM patients 
            ORDER BY id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Database Error:", err.message);
        res.status(500).json({ error: "کێشەیەک لە داتابەیس هەیە" });
    }
});

// POST: تۆمارکرنا نەخۆشەکێ نوو
app.post('/api/patients', async (req, res) => {
    const { name, age, phone, illness } = req.body;

    if (!name || !age) {
        return res.status(400).json({ error: 'تکایە ناڤ و تەمەنی بنڤیسە!' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO patients (name, age, phone, illness) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, age, phone, illness]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Insert Error:", err.message);
        res.status(500).json({ error: "نەتوانیرا داتا پاشەکەوت بکرێت" });
    }
});

// --- 3. نیشاندانا فایلی Frontend ---
app.use(express.static(path.join(__dirname, '/')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 4. هەناردەکردنی ئەپ بۆ Vercel ---
module.exports = app;

// بۆ تاقیکردنەوەی ناوخۆیی (ئەگەر ویستت لەسەر کۆمپیوتەر ئیشی پێ بکەیت)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}
