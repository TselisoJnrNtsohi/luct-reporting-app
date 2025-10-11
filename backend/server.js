const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');  // For file handling if needed

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// PostgreSQL Connection Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Local fallback
    user: 'postgres', host: 'localhost', database: 'luct_report', password: '0707', port: 5432
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

// 1. Auth: Register (Updated)
app.post('/api/register', async (req, res) => {
    const { username, password, role, full_name, email, student_id } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    try {
        const result = await pool.query(
            'INSERT INTO users (username, password, role, full_name, email, student_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [username, hashed, role, full_name, email, student_id || null]
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

// 2. Profile Management (Shared)
app.get('/api/profile', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

app.put('/api/profile', authenticate, async (req, res) => {
  const { full_name, email, profile_photo_url } = req.body;
  try {
    await pool.query('UPDATE users SET full_name = $1, email = $2, profile_photo_url = $3 WHERE id = $4', [full_name, email, profile_photo_url, req.user.id]);
    res.json({ msg: 'Profile updated' });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

app.put('/api/change-password', authenticate, async (req, res) => {
  const { old_password, new_password } = req.body;
  try {
    const user = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const match = await bcrypt.compare(old_password, user.rows[0].password);
    if (!match) return res.status(400).json({ msg: 'Old password incorrect' });
    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
    res.json({ msg: 'Password changed' });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// 3. Notifications (Shared)
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

app.put('/api/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ msg: 'Marked as read' });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// 4. Dashboard Overview (Shared)
app.get('/api/dashboard-overview', authenticate, async (req, res) => {
  try {
    const stats = {};
    if (req.user.role === 'Student') {
      stats.pendingRatings = await pool.query('SELECT COUNT(*) FROM lectures l LEFT JOIN ratings r ON l.id = r.lecture_id AND r.rated_by = $1 WHERE r.id IS NULL', [req.user.id]);
      stats.lastReport = await pool.query('SELECT created_at FROM lectures WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    } else if (req.user.role === 'Lecturer') {
      stats.pendingReports = await pool.query('SELECT COUNT(*) FROM lectures WHERE lecturer_id = $1 AND status = $2', [req.user.id, 'Pending']);
      stats.activeClasses = await pool.query('SELECT COUNT(DISTINCT class_id) FROM lectures WHERE lecturer_id = $1', [req.user.id]);
    } // Add for other roles
    res.json(stats);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// 5. Lecturer: Submit Report (Updated)
app.post('/api/lectures', authenticate, async (req, res) => {
  const { class_id, week_of_reporting, date_of_lecture, actual_students, topic_taught, learning_outcomes, recommendations, materials_used, materials_file_url, total_students } = req.body;
  const lecturer_id = req.user.id;
  const attendance_percentage = total_students > 0 ? ((actual_students / total_students) * 100).toFixed(2) : 0;
  try {
    const result = await pool.query(
      'INSERT INTO lectures (class_id, week_of_reporting, date_of_lecture, lecturer_id, actual_students, topic_taught, learning_outcomes, recommendations, materials_used, materials_file_url, attendance_percentage, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id',
      [class_id, week_of_reporting, date_of_lecture, lecturer_id, actual_students, topic_taught, learning_outcomes, recommendations, materials_used, materials_file_url, attendance_percentage, 'Pending']
    );
    res.json({ msg: 'Report submitted', lectureId: result.rows[0].id });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// Update Report Status (for PRL/PL)
app.put('/api/reports/:id/status', authenticate, async (req, res) => {
  if (!['PRL', 'PL'].includes(req.user.role)) return res.status(403).json({ msg: 'Access denied' });
  const { id } = req.params;
  const { status, feedback } = req.body;
  try {
    await pool.query('UPDATE lectures SET status = $1 WHERE id = $2', [status, id]);
    if (feedback) {
      await pool.query('INSERT INTO feedbacks (lecture_id, feedback_text, added_by) VALUES ($1, $2, $3)', [id, feedback, req.user.id]);
    }
    res.json({ msg: 'Status updated' });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// Lecturer Announcements
app.post('/api/announcements', authenticate, async (req, res) => {
  if (req.user.role !== 'Lecturer') return res.status(403).json({ msg: 'Access denied' });
  const { class_id, title, message } = req.body;
  const lecturer_id = req.user.id;
  try {
    const result = await pool.query('INSERT INTO announcements (class_id, title, message, lecturer_id) VALUES ($1, $2, $3, $4) RETURNING id', [class_id, title, message, lecturer_id]);
    res.json({ msg: 'Announcement posted', id: result.rows[0].id });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

app.get('/api/announcements/:classId', authenticate, async (req, res) => {
  const { classId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM announcements WHERE class_id = $1 ORDER BY created_at DESC', [classId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Student Assignments & Submissions (from previous)
app.get('/api/assignments/:classId', authenticate, async (req, res) => {
  const { classId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM assignments WHERE class_id = $1 ORDER BY due_date', [classId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

app.post('/api/assignment-submissions', authenticate, async (req, res) => {
  if (req.user.role !== 'Student') return res.status(403).json({ msg: 'Access denied' });
  const { assignment_id, submission_file_url } = req.body;
  const student_id = req.user.id;
  try {
    await pool.query('INSERT INTO assignment_submissions (assignment_id, student_id, submission_file_url) VALUES ($1, $2, $3)', [assignment_id, student_id, submission_file_url]);
    res.json({ msg: 'Submission added' });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// PL Lecturers Management
app.get('/api/lecturers', authenticate, async (req, res) => {
  if (req.user.role !== 'PL') return res.status(403).json({ msg: 'Access denied' });
  try {
    const result = await pool.query('SELECT id, full_name, email FROM users WHERE role = $1', ['Lecturer']);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

app.post('/api/assign-lecturer', authenticate, async (req, res) => {
  if (req.user.role !== 'PL') return res.status(403).json({ msg: 'Access denied' });
  const { course_id, lecturer_id } = req.body;
  try {
    await pool.query('UPDATE courses SET lecturer_id = $1 WHERE id = $2', [lecturer_id, course_id]);
    res.json({ msg: 'Lecturer assigned' });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// Dashboard Overview (Shared)
app.get('/api/dashboard-overview', authenticate, async (req, res) => {
  try {
    const stats = {};
    if (req.user.role === 'Student') {
      stats.pendingRatings = (await pool.query('SELECT COUNT(*) FROM lectures l LEFT JOIN ratings r ON l.id = r.lecture_id AND r.rated_by = $1 WHERE r.id IS NULL', [req.user.id])).rows[0].count;
      stats.lastReport = (await pool.query('SELECT created_at FROM lectures WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1', [req.user.id])).rows[0]?.created_at;
    } else if (req.user.role === 'Lecturer') {
      stats.pendingReports = (await pool.query('SELECT COUNT(*) FROM lectures WHERE lecturer_id = $1 AND status = $2', [req.user.id, 'Pending'])).rows[0].count;
      stats.activeClasses = (await pool.query('SELECT COUNT(DISTINCT class_id) FROM lectures WHERE lecturer_id = $1', [req.user.id])).rows[0].count;
    } else if (req.user.role === 'PRL') {
      stats.reportsReviewed = (await pool.query('SELECT COUNT(*) FROM feedbacks WHERE added_by = $1', [req.user.id])).rows[0].count;
      stats.pendingReports = (await pool.query('SELECT COUNT(*) FROM lectures WHERE status = $1', ['Pending'])).rows[0].count;
    } else if (req.user.role === 'PL') {
      stats.totalReports = (await pool.query('SELECT COUNT(*) FROM lectures')).rows[0].count;
      stats.activeLecturers = (await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['Lecturer'])).rows[0].count;
    }
    res.json(stats);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Search (Updated for multiple modules)
app.get('/api/search/:module', authenticate, async (req, res) => {
  const { module } = req.params;
  const { q: searchQuery } = req.query;
  let sql = '';
  let params = [`%${searchQuery}%`];
  if (module === 'lectures') {
    sql = 'SELECT * FROM lectures WHERE topic_taught ILIKE $1 OR recommendations ILIKE $1';
  } else if (module === 'courses') {
    sql = 'SELECT * FROM courses WHERE name ILIKE $1 OR code ILIKE $1';
  } else if (module === 'users') {
    sql = 'SELECT id, full_name, role FROM users WHERE full_name ILIKE $1 OR email ILIKE $1';
  }
  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Excel Export (Updated)
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
      ['Lecture Report - LUCT Faculty System'],
      [],
      ['Field', 'Value'],
      ['ID', data.id],
      ['Faculty', data.faculty_name],
      ['Course', data.course_name],
      ['Class', data.class_name],
      ['Lecturer', data.lecturer_name],
      ['Total Students', data.total_students],
      ['Actual Present', data.actual_students],
      ['Attendance %', data.attendance_percentage + '%'],
      ['Week Reporting', data.week_of_reporting],
      ['Date', data.date_of_lecture],
      ['Topic Taught', data.topic_taught],
      ['Learning Outcomes', data.learning_outcomes],
      ['Recommendations', data.recommendations],
      ['Materials Used', data.materials_used || 'N/A'],
      ['Materials File', data.materials_file_url ? `=HYPERLINK("${data.materials_file_url}", "Download")` : 'N/A'],
      ['Status', data.status],
      ['Created At', data.created_at]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['A1'].s = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 }, fill: { fgColor: { rgb: '007BFF' } } };
    ws['A3'].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E9ECEF' } } };
    ws['B3'].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E9ECEF' } } };
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

// All Reports Export (Updated with status)
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
      ['LUCT All Faculty Reports Export'],
      [],
      ['ID', 'Faculty', 'Course', 'Class', 'Lecturer', 'Total Students', 'Actual Present', 'Attendance %', 'Week', 'Date', 'Topic', 'Outcomes', 'Recommendations', 'Status', 'Avg Rating'],
      ...result.rows.map(row => [
        row.id, row.faculty_name, row.course_name, row.class_name, row.lecturer_name, 
        row.total_students, row.actual_students, row.attendance_percentage + '%', row.week_of_reporting, row.date_of_lecture, 
        row.topic_taught, row.learning_outcomes, row.recommendations, row.status, row.avg_rating || 'N/A'
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['A1'].s = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 16 }, fill: { fgColor: { rgb: '007BFF' } } };
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const cellAddress = { c: C, r: 2 };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      if (!ws[cellRef]) continue;
      ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E9ECEF' } } };
    }
    const colWidths = [
      { wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 25 },
      { wch: 30 }, { wch: 25 }, { wch: 10 }, { wch: 10 }
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

// 8. Search (Updated)
app.get('/api/search/:module', authenticate, async (req, res) => {
  const { module } = req.params;
  const { q: searchQuery } = req.query;
  let sql = '';
  let params = [`%${searchQuery}%`];
  if (module === 'lectures') {
    sql = 'SELECT * FROM lectures WHERE topic_taught ILIKE $1 OR recommendations ILIKE $1';
  } else if (module === 'courses') {
    sql = 'SELECT * FROM courses WHERE name ILIKE $1 OR code ILIKE $1';
  } else if (module === 'users') {
    sql = 'SELECT id, full_name, role FROM users WHERE full_name ILIKE $1 OR email ILIKE $1';
  }
  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));