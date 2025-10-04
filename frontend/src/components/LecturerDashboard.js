import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Table, Container, InputGroup, FormControl, Alert, Row, Col } from 'react-bootstrap';

const LecturerDashboard = () => {
  const [formData, setFormData] = useState({
    class_id: '', week_of_reporting: '', date_of_lecture: '', actual_students: '', topic_taught: '',
    learning_outcomes: '', recommendations: ''
  });
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchClasses();
    fetchReports();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/lectures', formData, config);
      fetchReports();
      alert('Report submitted');
    } catch (err) {
      setError(err.response?.data.msg || 'Submit failed');
    }
  };

  const handleSearch = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/search/lectures?q=${searchQuery}`, config);
      setReports(res.data);
    } catch (err) {
      setError('Search failed');
    }
  };

  const exportExcel = (id) => {
    window.open(`http://localhost:5000/api/export/reports/${id}`, '_blank');
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <Container className="dashboard mt-5">
      <Row>
        <Col><h2>Lecturer Dashboard - Reporting</h2></Col>
        <Col className="text-end"><Button variant="outline-danger" onClick={logout}>Logout</Button></Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleSubmit} className="mb-4">
        <Row>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Class</Form.Label>
              <Form.Select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}>
                <option value="">Select Class</option>
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.faculty_name} - {cls.course_name} - {cls.name}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Week of Reporting</Form.Label>
              <Form.Control type="number" value={formData.week_of_reporting} onChange={(e) => setFormData({ ...formData, week_of_reporting: e.target.value })} />
            </Form.Group>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Date of Lecture</Form.Label>
              <Form.Control type="date" value={formData.date_of_lecture} onChange={(e) => setFormData({ ...formData, date_of_lecture: e.target.value })} />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Actual Students Present</Form.Label>
              <Form.Control type="number" value={formData.actual_students} onChange={(e) => setFormData({ ...formData, actual_students: e.target.value })} />
            </Form.Group>
          </Col>
        </Row>
        <Form.Group className="mb-3">
          <Form.Label>Topic Taught</Form.Label>
          <Form.Control as="textarea" value={formData.topic_taught} onChange={(e) => setFormData({ ...formData, topic_taught: e.target.value })} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Learning Outcomes</Form.Label>
          <Form.Control as="textarea" value={formData.learning_outcomes} onChange={(e) => setFormData({ ...formData, learning_outcomes: e.target.value })} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Recommendations</Form.Label>
          <Form.Control as="textarea" value={formData.recommendations} onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })} />
        </Form.Group>
        <Button type="submit">Submit Report</Button>
      </Form>

      <InputGroup className="mb-3">
        <FormControl placeholder="Search reports..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <Button onClick={handleSearch}>Search</Button>
      </InputGroup>

      <Table striped bordered hover>
        <thead><tr><th>ID</th><th>Class</th><th>Topic</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          {reports.map(report => (
            <tr key={report.id}>
              <td>{report.id}</td>
              <td>{report.class_name}</td>
              <td>{report.topic_taught}</td>
              <td>{report.date_of_lecture}</td>
              <td><Button size="sm" onClick={() => exportExcel(report.id)}>Export Excel</Button></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default LecturerDashboard;