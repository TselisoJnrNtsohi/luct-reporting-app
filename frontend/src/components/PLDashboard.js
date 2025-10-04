import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Table, Container, Modal, InputGroup, FormControl, Alert, Row, Col } from 'react-bootstrap';

const PLDashboard = () => {
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({ name: '', code: '', faculty_id: '' });
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [classFormData, setClassFormData] = useState({ name: '', course_id: '', total_students: '', venue: '', scheduled_time: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchFaculties();
    fetchCourses();
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
      const res = await axios.get('http://localhost:5000/api/courses', config); // Add GET /api/courses route if needed
      setCourses(res.data);
    } catch (err) {
      setError('Failed to fetch courses');
    }
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/courses', formData, config);
      setShowCourseModal(false);
      setFormData({ name: '', code: '', faculty_id: '' });
      fetchCourses();
      alert('Course added');
    } catch (err) {
      setError(err.response?.data.msg || 'Add course failed');
    }
  };

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/classes', classFormData, config);
      setShowClassModal(false);
      setClassFormData({ name: '', course_id: '', total_students: '', venue: '', scheduled_time: '' });
      alert('Class added');
    } catch (err) {
      setError(err.response?.data.msg || 'Add class failed');
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
        <Col><h2>PL Dashboard - Manage Courses & Classes</h2></Col>
        <Col className="text-end"><Button variant="outline-danger" onClick={logout}>Logout</Button></Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      <Button className="mb-3" onClick={() => setShowCourseModal(true)}>Add Course</Button>
      <Button className="mb-3 ms-2" onClick={() => setShowClassModal(true)}>Add Class</Button>

      <InputGroup className="mb-3">
        <FormControl placeholder="Search courses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <Button onClick={handleSearch}>Search</Button>
      </InputGroup>

      <Table striped bordered hover>
        <thead><tr><th>ID</th><th>Name</th><th>Code</th><th>Faculty</th></tr></thead>
        <tbody>
          {courses.map(course => (
            <tr key={course.id}>
              <td>{course.id}</td>
              <td>{course.name}</td>
              <td>{course.code}</td>
              <td>{course.faculty_name || 'N/A'}</td> {/* Assume join in backend */}
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Course Modal */}
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

      {/* Class Modal */}
      <Modal show={showClassModal} onHide={() => setShowClassModal(false)}>
        <Modal.Header closeButton><Modal.Title>Add Class</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleClassSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control value={classFormData.name} onChange={(e) => setClassFormData({ ...classFormData, name: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Course</Form.Label>
              <Form.Select value={classFormData.course_id} onChange={(e) => setClassFormData({ ...classFormData, course_id: e.target.value })}>
                <option value="">Select</option>
                {courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Total Students</Form.Label>
              <Form.Control type="number" value={classFormData.total_students} onChange={(e) => setClassFormData({ ...classFormData, total_students: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Venue</Form.Label>
              <Form.Control value={classFormData.venue} onChange={(e) => setClassFormData({ ...classFormData, venue: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Scheduled Time</Form.Label>
              <Form.Control type="time" value={classFormData.scheduled_time} onChange={(e) => setClassFormData({ ...classFormData, scheduled_time: e.target.value })} />
            </Form.Group>
            <Button type="submit">Add</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default PLDashboard;