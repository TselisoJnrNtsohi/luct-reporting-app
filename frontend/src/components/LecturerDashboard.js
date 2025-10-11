import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Table, Container, InputGroup, FormControl, Alert, Row, Col, Tabs, Tab } from 'react-bootstrap';

const LecturerDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [students, setStudents] = useState([]);  // For monitoring
  const [activeTab, setActiveTab] = useState('classes');
  const [formData, setFormData] = useState({
    class_id: '', week_of_reporting: '', date_of_lecture: '', actual_students: '', total_students: '', topic_taught: '',
    learning_outcomes: '', recommendations: '', materials_used: '', materials_file_url: ''  // New
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchClasses();
    fetchReports();
    fetchStudents();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/classes', config);
      setClasses(res.data);
    } catch (err) {
      setError('Failed to fetch classes');
    }
  };

  const fetchReports = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/reports/Lecturer', config);
      setReports(res.data);
    } catch (err) {
      setError('Failed to fetch reports');
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/students');  // New route if needed
      setStudents(res.data);
    } catch (err) {
      setError('Failed to fetch students');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const total_students = classes.find(c => c.id == formData.class_id)?.total_students || 0;
    try {
      await axios.post('http://localhost:5000/api/lectures', { ...formData, total_students }, config);
      fetchReports();
      alert('Report submitted');
    } catch (err) {
      setError(err.response?.data.msg || 'Submit failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <Container className="dashboard mt-5">
      <Row>
        <Col><h2>Lecturer Dashboard</h2></Col>
        <Col className="text-end"><Button variant="outline-danger" onClick={logout}>Logout</Button></Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="classes" title="Classes">
          {/* Classes table */}
        </Tab>
        <Tab eventKey="reports" title="Reports">
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Class</Form.Label>
                  <Form.Select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}>
                    <option value="">Select</option>
                    {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Total Students (Auto)</Form.Label>
                  <Form.Control type="number" value={classes.find(c => c.id == formData.class_id)?.total_students || ''} readOnly />
                </Form.Group>
              </Col>
            </Row>
            {/* Other fields */}
            <Form.Group className="mb-3">
              <Form.Label>Actual Students</Form.Label>
              <Form.Control type="number" value={formData.actual_students} onChange={(e) => setFormData({ ...formData, actual_students: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Attendance % (Auto)</Form.Label>
              <Form.Control type="text" value={formData.total_students && formData.actual_students ? ((formData.actual_students / formData.total_students) * 100).toFixed(2) + '%' : ''} readOnly />
            </Form.Group>
            {/* ... other fields ... */}
            <Form.Group className="mb-3">
              <Form.Label>Materials Used</Form.Label>
              <Form.Control as="textarea" value={formData.materials_used} onChange={(e) => setFormData({ ...formData, materials_used: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Materials File URL</Form.Label>
              <Form.Control type="url" value={formData.materials_file_url} onChange={(e) => setFormData({ ...formData, materials_file_url: e.target.value })} placeholder="https://example.com/slides.pdf" />
            </Form.Group>
            <Button type="submit" className="btn-primary">Submit Report</Button>
          </Form>
          {/* Reports table with Excel download */}
        </Tab>
        <Tab eventKey="monitoring" title="Monitoring">
          <Table striped bordered hover>
            <thead><tr><th>Student</th><th>Attendance</th><th>Engagement</th></tr></thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>{s.full_name}</td>
                  <td>{s.attendance_rate}%</td>
                  <td>{s.average_rating}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="rating" title="Rating">
          {/* View student feedback */}
        </Tab>
      </Tabs>
    </Container>
  );
};

export default LecturerDashboard;