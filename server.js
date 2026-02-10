const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();

// --- Middlewares ---
app.use(express.json());
app.use(cors());

// --- 1. گرێدان ب داتابەیسا PostgreSQL ---
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: '11223344',
    port: 5432,
});

// --- 2. API Routes ---

// GET: ئینانا هەمی نەخۆشان ب ستایلێ ڕێکەوتا (ڕۆژ/هەیڤ/ساڵ)
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
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: err.message });
    }
});

// --- 3. Test Route (بۆ پشکنینا سێرڤەری) ---
app.get('/test', (req, res) => {
    res.send('Server is running perfectly ✅');
});

// --- 4. نیشاندانا فایلی Static (Frontend) ---
// ئەڤ دوو دێڕە دڵنیا دکەن کو وێبسایت ل سەر مۆبایل و کۆمپیوتەری ڤەببیت
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 5. هەلهێلانا سێرڤەری ---
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 Server is live on: http://localhost:${PORT}`);
    console.log(`📱 For Mobile use: http://172.20.10.2:${PORT}`);
    console.log(`✅ Database: hospital_db connected`);
    console.log(`-----------------------------------------`);
});