const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'your_jwt_secret_key'; // Change in production

// Middleware
app.use(cors());
app.use(bodyParser.json());

// PostgreSQL Connection Pool
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'luct_report',
    password: '0707',  // Your password here
    port: 5432,
});

pool.connect((err) => {
    if (err) throw err;
    console.log('PostgreSQL Connected');
});

// Auth Middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ msg: 'No token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Invalid token' });
    }
};

// Routes

// 1. Auth: Register
app.post('/api/register', async (req, res) => {
    const { username, password, role, full_name, email } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    try {
        const result = await pool.query(
            'INSERT INTO users (username, password, role, full_name, email) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [username, hashed, role, full_name, email]
        );
        res.json({ msg: 'User registered', userId: result.rows[0].id });
    } catch (err) {
        res.status(400).json({ msg: err.message });
    }
});

// 1. Auth: Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(400).json({ msg: 'Invalid credentials' });
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ msg: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ msg: 'Logged in', token, user: { id: user.id, role: user.role, full_name: user.full_name } });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// 2. Lecturer: Submit Report (Add Faculty/Class/Course fetch if needed)
app.get('/api/classes', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT cl.*, c.name as course_name, f.name as faculty_name 
            FROM classes cl 
            JOIN courses c ON cl.course_id = c.id 
            JOIN faculties f ON c.faculty_id = f.id
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

app.post('/api/lectures', authenticate, async (req, res) => {
    const { class_id, week_of_reporting, date_of_lecture, actual_students, topic_taught, learning_outcomes, recommendations } = req.body;
    const lecturer_id = req.user.id;
    try {
        const result = await pool.query(
            'INSERT INTO lectures (class_id, week_of_reporting, date_of_lecture, lecturer_id, actual_students, topic_taught, learning_outcomes, recommendations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [class_id, week_of_reporting, date_of_lecture, lecturer_id, actual_students, topic_taught, learning_outcomes, recommendations]
        );
        res.json({ msg: 'Report submitted', lectureId: result.rows[0].id });
    } catch (err) {
        res.status(400).json({ msg: err.message });
    }
});

// 3. PRL/PL: View Reports & Add Feedback
app.get('/api/reports/:role', authenticate, async (req, res) => {
    const { role } = req.params;
    let query = `SELECT l.*, u.full_name as lecturer_name, c.name as course_name, cl.name as class_name, f.name as faculty_name 
                 FROM lectures l 
                 JOIN users u ON l.lecturer_id = u.id 
                 JOIN classes cl ON l.class_id = cl.id 
                 JOIN courses c ON cl.course_id = c.id 
                 JOIN faculties f ON c.faculty_id = f.id`;
    let params = [];
    if (role === 'PRL') {
        query += ' WHERE f.id = $1';
        params = [req.query.faculty_id || 1];
    }
    try {
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

app.post('/api/feedback', authenticate, async (req, res) => {
    const { lecture_id, feedback_text } = req.body;
    const added_by = req.user.id;
    try {
        await pool.query('INSERT INTO feedbacks (lecture_id, feedback_text, added_by) VALUES ($1, $2, $3)', [lecture_id, feedback_text, added_by]);
        res.json({ msg: 'Feedback added' });
    } catch (err) {
        res.status(400).json({ msg: err.message });
    }
});

// 4. Monitoring & Rating
app.get('/api/monitoring/:lectureId', authenticate, async (req, res) => {
    const { lectureId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM ratings WHERE lecture_id = $1', [lectureId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

app.post('/api/rating', authenticate, async (req, res) => {
    const { lecture_id, rating, comments } = req.body;
    const rated_by = req.user.id;
    try {
        await pool.query('INSERT INTO ratings (lecture_id, rated_by, rating, comments) VALUES ($1, $2, $3, $4)', [lecture_id, rated_by, rating, comments]);
        res.json({ msg: 'Rating added' });
    } catch (err) {
        res.status(400).json({ msg: err.message });
    }
});

// 5. PL: Manage Courses
app.get('/api/faculties', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM faculties');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

app.post('/api/courses', authenticate, async (req, res) => {
    if (req.user.role !== 'PL') return res.status(403).json({ msg: 'Access denied' });
    const { name, code, faculty_id } = req.body;
    try {
        const result = await pool.query('INSERT INTO courses (name, code, faculty_id) VALUES ($1, $2, $3) RETURNING id', [name, code, faculty_id]);
        res.json({ msg: 'Course added', courseId: result.rows[0].id });
    } catch (err) {
        res.status(400).json({ msg: err.message });
    }
});

app.post('/api/classes', authenticate, async (req, res) => {
    if (req.user.role !== 'PL') return res.status(403).json({ msg: 'Access denied' });
    const { name, course_id, total_students, venue, scheduled_time } = req.body;
    try {
        const result = await pool.query('INSERT INTO classes (name, course_id, total_students, venue, scheduled_time) VALUES ($1, $2, $3, $4, $5) RETURNING id', [name, course_id, total_students, venue, scheduled_time]);
        res.json({ msg: 'Class added', classId: result.rows[0].id });
    } catch (err) {
        res.status(400).json({ msg: err.message });
    }
});
// Student: View All Lectures for Monitoring
app.get('/api/reports/Student', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, u.full_name as lecturer_name, c.name as course_name, cl.name as class_name, f.name as faculty_name,
      AVG(r.rating) as avg_rating  -- Average rating for each lecture
      FROM lectures l 
      JOIN users u ON l.lecturer_id = u.id 
      JOIN classes cl ON l.class_id = cl.id 
      JOIN courses c ON cl.course_id = c.id 
      JOIN faculties f ON c.faculty_id = f.id 
      LEFT JOIN ratings r ON l.id = r.lecture_id 
      GROUP BY l.id, u.full_name, c.name, cl.name, f.name
      ORDER BY l.date_of_lecture DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// 6. Search (Extra Credit)
app.get('/api/search/:module', authenticate, async (req, res) => {
    const { module } = req.params;
    const { q: searchQuery } = req.query; // Use 'q' for query param
    let sql = '';
    let params = [`%${searchQuery}%`];
    if (module === 'lectures') {
        sql = 'SELECT * FROM lectures WHERE topic_taught ILIKE $1 OR recommendations ILIKE $1';
    } else if (module === 'courses') {
        sql = 'SELECT * FROM courses WHERE name ILIKE $1 OR code ILIKE $1';
    }
    try {
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// 7. Excel Export - Single Report (Enhanced Formatting)
app.get('/api/export/reports/:lectureId', authenticate, async (req, res) => {
  const { lectureId } = req.params;
  try {
    const result = await pool.query(`
      SELECT l.*, u.full_name as lecturer_name, c.name as course_name, cl.name as class_name, f.name as faculty_name, cl.total_students
      FROM lectures l 
      JOIN users u ON l.lecturer_id = u.id 
      JOIN classes cl ON l.class_id = cl.id 
      JOIN courses c ON cl.course_id = c.id 
      JOIN faculties f ON c.faculty_id = f.id 
      WHERE l.id = $1
    `, [lectureId]);
    if (result.rows.length === 0) return res.status(404).json({ msg: 'Report not found' });

    const data = result.rows[0];
    const wsData = [
      ['Lecture Report - LUCT Faculty System'],  // Title row
      [],  // Empty for spacing
      ['Field', 'Value'],  // Headers
      ['ID', data.id],
      ['Faculty', data.faculty_name],
      ['Course', data.course_name],
      ['Class', data.class_name],
      ['Lecturer', data.lecturer_name],
      ['Total Students', data.total_students],
      ['Actual Present', data.actual_students],
      ['Week Reporting', data.week_of_reporting],
      ['Date', data.date_of_lecture],
      ['Topic Taught', data.topic_taught],
      ['Learning Outcomes', data.learning_outcomes],
      ['Recommendations', data.recommendations],
      ['Created At', data.created_at]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Formatting: Bold headers, auto-width
    ws['A1'].s = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 }, fill: { fgColor: { rgb: '007BFF' } } };  // Blue header
    ws['A3'].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E9ECEF' } } };
    ws['B3'].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E9ECEF' } } };
    XLSX.utils.sheet_add_aoa(ws, [[]], { origin: -1 });  // Auto-fit
    const colWidths = [{ wch: 20 }, { wch: 40 }];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lecture Report');
    const filename = `luct-report-${lectureId}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// New: Export All Reports (for Admins like PRL/PL)
app.get('/api/export/all-reports', authenticate, async (req, res) => {
  if (!['PRL', 'PL'].includes(req.user.role)) return res.status(403).json({ msg: 'Access denied' });
  try {
    const result = await pool.query(`
      SELECT l.*, u.full_name as lecturer_name, c.name as course_name, cl.name as class_name, f.name as faculty_name, cl.total_students,
      AVG(r.rating) as avg_rating
      FROM lectures l 
      JOIN users u ON l.lecturer_id = u.id 
      JOIN classes cl ON l.class_id = cl.id 
      JOIN courses c ON cl.course_id = c.id 
      JOIN faculties f ON c.faculty_id = f.id 
      LEFT JOIN ratings r ON l.id = r.lecture_id 
      GROUP BY l.id, u.full_name, c.name, cl.name, f.name, cl.total_students
      ORDER BY l.date_of_lecture DESC
    `);
    if (result.rows.length === 0) return res.status(404).json({ msg: 'No reports found' });

    const wsData = [
      ['LUCT All Faculty Reports Export'],  // Title
      [],  // Spacing
      ['ID', 'Faculty', 'Course', 'Class', 'Lecturer', 'Total Students', 'Actual Present', 'Week', 'Date', 'Topic', 'Outcomes', 'Recommendations', 'Avg Rating'],  // Headers
      ...result.rows.map(row => [
        row.id, row.faculty_name, row.course_name, row.class_name, row.lecturer_name, 
        row.total_students, row.actual_students, row.week_of_reporting, row.date_of_lecture, 
        row.topic_taught, row.learning_outcomes, row.recommendations, row.avg_rating || 'N/A'
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Formatting
    ws['A1'].s = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 16 }, fill: { fgColor: { rgb: '007BFF' } } };
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const cellAddress = { c: C, r: 2 };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      if (!ws[cellRef]) continue;
      ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E9ECEF' } } };
    }
    const colWidths = [
      { wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },  // ID to Lecturer
      { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 25 },  // Total to Topic
      { wch: 30 }, { wch: 25 }, { wch: 10 }  // Outcomes to Avg
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All Reports');
    const filename = `luct-all-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});
app.listen(PORT, () => console.log(`Server on port ${PORT}`));