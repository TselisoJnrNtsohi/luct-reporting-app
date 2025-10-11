import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Table, Container, Modal, InputGroup, FormControl, Alert, Row, Col, Tabs, Tab } from 'react-bootstrap';

const PRLDashboard = () => {
  const [reports, setReports] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [activeTab, setActiveTab] = useState('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchReports();
    fetchCourses();
    fetchClasses();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/reports/PRL?faculty_id=1', config);  // Adjust faculty_id
      setReports(res.data);
    } catch (err) {
      setError('Failed to fetch reports');
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/courses');  // New route if needed
      setCourses(res.data);
    } catch (err) {
      setError('Failed to fetch courses');
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/classes');  // New route if needed
      setClasses(res.data);
    } catch (err) {
      setError('Failed to fetch classes');
    }
  };

  const handleFeedback = async (lectureId) => {
    try {
      await axios.post('http://localhost:5000/api/feedback', { lecture_id: lectureId, feedback_text: feedbackText }, config);
      setFeedbackText('');
      setShowModal(false);
      fetchReports();
      alert('Feedback added');
    } catch (err) {
      setError('Feedback failed');
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

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <Container className="dashboard mt-5">
      <Row>
        <Col><h2>PRL Dashboard</h2></Col>
        <Col className="text-end"><Button variant="outline-danger" onClick={logout}>Logout</Button></Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="courses" title="Courses">
          <Table striped bordered hover>
            <thead><tr><th>Course</th><th>Assigned Lecturer</th><th>Classes</th><th>Stats</th></tr></thead>
            <tbody>
              {courses.map(course => (
                <tr key={course.id}>
                  <td>{course.name}</td>
                  <td>{course.lecturer_name || 'N/A'}</td>
                  <td>{course.class_count || 0}</td>
                  <td>Avg Rating: {course.avg_rating || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="reports" title="Reports">
          <InputGroup className="mb-3">
            <FormControl placeholder="Search reports..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Button onClick={handleSearch}>Search</Button>
          </InputGroup>
          <Table striped bordered hover>
            <thead><tr><th>ID</th><th>Lecturer</th><th>Topic</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>{report.lecturer_name}</td>
                  <td>{report.topic_taught}</td>
                  <td>{report.date_of_lecture}</td>
                  <td>
                    <Button size="sm" variant="primary" onClick={() => { setSelectedLecture(report); setShowModal(true); }}>Add Feedback</Button>
                    <Button size="sm" className="ms-1" onClick={() => window.open(`http://localhost:5000/api/export/reports/${report.id}`, '_blank')}>Export</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="monitoring" title="Monitoring">
          <Table striped bordered hover>
            <thead><tr><th>Class</th><th>Students</th><th>Avg Attendance</th><th>Performance</th></tr></thead>
            <tbody>
              {classes.map(cls => (
                <tr key={cls.id}>
                  <td>{cls.name}</td>
                  <td>{cls.student_count || 0}</td>
                  <td>{cls.avg_attendance || 'N/A'}</td>
                  <td>{cls.avg_rating || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="rating" title="Rating">
          {/* View ratings table */}
          <Table striped bordered hover>
            <thead><tr><th>Lecture</th><th>Student</th><th>Rating</th><th>Feedback</th></tr></thead>
            <tbody>
              {/* Fetch from ratings table */}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="classes" title="Classes">
          <Table striped bordered hover>
            <thead><tr><th>Class</th><th>Course</th><th>Venue</th><th>Time</th></tr></thead>
            <tbody>
              {classes.map(cls => (
                <tr key={cls.id}>
                  <td>{cls.name}</td>
                  <td>{cls.course_name}</td>
                  <td>{cls.venue}</td>
                  <td>{cls.scheduled_time}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
      </Tabs>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Feedback for Lecture {selectedLecture?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Feedback</Form.Label>
            <Form.Control as="textarea" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={() => handleFeedback(selectedLecture?.id)}>Submit</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PRLDashboard;