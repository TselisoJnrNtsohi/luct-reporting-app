import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Table, Container, Modal, InputGroup, FormControl, Alert, Row, Col, Tabs, Tab } from 'react-bootstrap';

const PLDashboard = () => {
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [reports, setReports] = useState([]);
  const [formData, setFormData] = useState({ name: '', code: '', faculty_id: '', lecturer_id: '' });
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [activeTab, setActiveTab] = useState('courses');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchFaculties();
    fetchCourses();
    fetchLecturers();
    fetchClasses();
    fetchLectures();
    fetchReports();
  }, []);

  const fetchFaculties = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/faculties', config);
      setFaculties(res.data);
    } catch (err) {
      setError('Failed to fetch faculties');
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/courses', config);
      setCourses(res.data);
    } catch (err) {
      setError('Failed to fetch courses');
    }
  };

  const fetchLecturers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/lecturers', config);
      setLecturers(res.data);
    } catch (err) {
      setError('Failed to fetch lecturers');
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/classes', config);
      setClasses(res.data);
    } catch (err) {
      setError('Failed to fetch classes');
    }
  };

  const fetchLectures = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/lectures', config);  // New route if needed
      setLectures(res.data);
    } catch (err) {
      setError('Failed to fetch lectures');
    }
  };

  const fetchReports = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/reports/PL', config);
      setReports(res.data);
    } catch (err) {
      setError('Failed to fetch reports');
    }
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/courses', formData, config);
      setShowCourseModal(false);
      setFormData({ name: '', code: '', faculty_id: '', lecturer_id: '' });
      fetchCourses();
      alert('Course added');
    } catch (err) {
      setError(err.response?.data.msg || 'Add course failed');
    }
  };

  const handleAssignLecturer = async (courseId) => {
    const lecturer_id = prompt('Enter lecturer ID:');
    try {
      await axios.post('http://localhost:5000/api/assign-lecturer', { course_id: courseId, lecturer_id }, config);
      alert('Lecturer assigned');
      fetchCourses();
    } catch (err) {
      setError('Assignment failed');
    }
  };

  const handleSearch = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/search/courses?q=${searchQuery}`, config);
      setCourses(res.data);
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
        <Col><h2>PL Dashboard</h2></Col>
        <Col className="text-end"><Button variant="outline-danger" onClick={logout}>Logout</Button></Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="courses" title="Courses">
          <Button className="mb-3" onClick={() => setShowCourseModal(true)}>Add Course</Button>
          <InputGroup className="mb-3">
            <FormControl placeholder="Search courses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Button onClick={handleSearch}>Search</Button>
          </InputGroup>
          <Table striped bordered hover>
            <thead><tr><th>ID</th><th>Name</th><th>Code</th><th>Faculty</th><th>Assigned Lecturer</th><th>Actions</th></tr></thead>
            <tbody>
              {courses.map(course => (
                <tr key={course.id}>
                  <td>{course.id}</td>
                  <td>{course.name}</td>
                  <td>{course.code}</td>
                  <td>{course.faculty_name}</td>
                  <td>{course.lecturer_name || 'N/A'}</td>
                  <td><Button size="sm" onClick={() => handleAssignLecturer(course.id)}>Assign Lecturer</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="reports" title="Reports">
          <Table striped bordered hover>
            <thead><tr><th>Report</th><th>PRL Feedback</th><th>Actions</th></tr></thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id}>
                  <td>{report.topic_taught}</td>
                  <td>{report.feedback_text || 'N/A'}</td>
                  <td><Button>View/Approve</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="monitoring" title="Monitoring">
          <Table striped bordered hover>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Total Students</td><td>{/* Fetch count */}</td></tr>
              <tr><td>Avg Attendance</td><td>{/* Calculate */}</td></tr>
              <tr><td>Overall Rating</td><td>{/* Avg */}</td></tr>
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
        <Tab eventKey="lectures" title="Lectures">
          <Table striped bordered hover>
            <thead><tr><th>Lecture</th><th>Class</th><th>Lecturer</th><th>Date</th></tr></thead>
            <tbody>
              {lectures.map(lec => (
                <tr key={lec.id}>
                  <td>{lec.topic_taught}</td>
                  <td>{lec.class_name}</td>
                  <td>{lec.lecturer_name}</td>
                  <td>{lec.date_of_lecture}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="rating" title="Rating">
          <Table striped bordered hover>
            <thead><tr><th>Entity</th><th>Rating</th><th>Feedback</th></tr></thead>
            <tbody>
              {/* System-wide ratings */}
            </tbody>
          </Table>
        </Tab>
      </Tabs>

      <Modal show={showCourseModal} onHide={() => setShowCourseModal(false)}>
        <Modal.Header closeButton><Modal.Title>Add Course</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCourseSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Code</Form.Label>
              <Form.Control value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Faculty</Form.Label>
              <Form.Select value={formData.faculty_id} onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })}>
                <option value="">Select</option>
                {faculties.map(fac => <option key={fac.id} value={fac.id}>{fac.name}</option>)}
              </Form.Select>
            </Form.Group>
            <Button type="submit">Add</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default PLDashboard;