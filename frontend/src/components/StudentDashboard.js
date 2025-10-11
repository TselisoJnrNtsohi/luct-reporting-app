import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Table, Container, Modal, InputGroup, FormControl, Alert, Row, Col, Tabs, Tab } from 'react-bootstrap';

const StudentDashboard = () => {
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [ratingData, setRatingData] = useState({ rating: 1, feedback: '' });
  const [activeTab, setActiveTab] = useState('classes');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const studentId = JSON.parse(atob(token.split('.')[1])).id;  // From token

  useEffect(() => {
    fetchEnrolledClasses();
    fetchProgress();
    fetchAssignments();
    fetchLectures();
  }, []);

  const fetchEnrolledClasses = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/enrolled-classes/${studentId}`, config);
      setEnrolledClasses(res.data);
    } catch (err) {
      setError('Failed to fetch classes');
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/student-progress/${studentId}`, config);
      setProgress(res.data);
    } catch (err) {
      setError('Failed to fetch progress');
    }
  };

  const fetchAssignments = async () => {
    // Fetch from all enrolled classes or specific
    try {
      const res = await axios.get('http://localhost:5000/api/assignments/1', config);  // Example; loop for all classes
      setAssignments(res.data);
    } catch (err) {
      setError('Failed to fetch assignments');
    }
  };

  const fetchLectures = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/reports/Student', config);
      setLectures(res.data);
    } catch (err) {
      setError('Failed to fetch lectures');
    }
  };

  const fetchRatings = async (lectureId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/monitoring/${lectureId}`, config);
      setRatings(res.data);
    } catch (err) {
      setError('Failed to fetch ratings');
    }
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/rating', { 
        lecture_id: selectedLecture.id, 
        rating: ratingData.rating, 
        comments: ratingData.feedback 
      }, config);
      setShowModal(false);
      setRatingData({ rating: 1, feedback: '' });
      fetchRatings(selectedLecture.id);
      fetchLectures();
      alert('Feedback and rating added!');
    } catch (err) {
      setError('Rating failed');
    }
  };

  const handleSubmitAssignment = async (assignmentId) => {
    const submission_file_url = 'https://example.com/submission.pdf';  // From file upload in real
    try {
      await axios.post('http://localhost:5000/api/assignment-submissions', { assignment_id: assignmentId, submission_file_url }, config);
      alert('Submission added');
    } catch (err) {
      setError('Submission failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <Container className="dashboard mt-5">
      <Row>
        <Col><h2>Student Dashboard</h2></Col>
        <Col className="text-end"><Button variant="outline-danger" onClick={logout}>Logout</Button></Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="classes" title="Classes">
          <Table striped bordered hover>
            <thead><tr><th>Class Name</th><th>Course</th><th>Faculty</th><th>Actions</th></tr></thead>
            <tbody>
              {enrolledClasses.map(ec => (
                <tr key={ec.id}>
                  <td>{ec.class_name}</td>
                  <td>{ec.course_name}</td>
                  <td>{ec.faculty_name}</td>
                  <td><Button onClick={() => fetchAssignments(ec.class_id)}>View Assignments</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="monitoring" title="Monitoring">
          <Table striped bordered hover>
            <thead><tr><th>Class</th><th>Attendance Rate</th><th>Average Rating</th></tr></thead>
            <tbody>
              {progress.map(p => (
                <tr key={p.id}>
                  <td>{p.class_id}</td>
                  <td>{p.attendance_rate}%</td>
                  <td>{p.average_rating}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="rating" title="Rating">
          <InputGroup className="mb-3">
            <FormControl placeholder="Search lectures..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Button onClick={() => {/* search logic */}}>Search</Button>
          </InputGroup>
          <Table striped bordered hover>
            <thead><tr><th>ID</th><th>Topic</th><th>Date</th><th>Avg Rating</th><th>Actions</th></tr></thead>
            <tbody>
              {lectures.map(lecture => (
                <tr key={lecture.id}>
                  <td>{lecture.id}</td>
                  <td>{lecture.topic_taught}</td>
                  <td>{lecture.date_of_lecture}</td>
                  <td>{lecture.avg_rating ? lecture.avg_rating.toFixed(1) : 'N/A'}</td>
                  <td>
                    <Button size="sm" onClick={() => { setSelectedLecture(lecture); fetchRatings(lecture.id); setShowModal(true); }}>
                      Rate & Feedback
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Rate & Feedback for {selectedLecture?.topic_taught}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedLecture && (
                <div className="mb-3">
                  <p><strong>Faculty:</strong> {selectedLecture.faculty_name} | <strong>Lecturer:</strong> {selectedLecture.lecturer_name}</p>
                  <p><em>Avg Rating: {selectedLecture.avg_rating ? selectedLecture.avg_rating.toFixed(1) : 'N/A'}</em></p>
                </div>
              )}
              <Form onSubmit={handleRatingSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Rating (1-5)</Form.Label>
                  <Form.Select value={ratingData.rating} onChange={(e) => setRatingData({ ...ratingData, rating: parseInt(e.target.value) })}>
                    {[1,2,3,4,5].map(r => <option key={r} value={r}>{r}</option>)}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Feedback</Form.Label>
                  <Form.Control as="textarea" value={ratingData.feedback} onChange={(e) => setRatingData({ ...ratingData, feedback: e.target.value })} />
                </Form.Group>
                <Button type="submit" className="btn-success">Submit</Button>
              </Form>
              {ratings.length > 0 && (
                <div className="mt-4">
                  <h5>Previous Ratings:</h5>
                  <Table size="sm">
                    <tbody>
                      {ratings.map(r => (
                        <tr key={r.id}>
                          <td>{r.rating} - {r.comments}</td>
                          <td>{new Date(r.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Modal.Body>
          </Modal>
        </Tab>
        <Tab eventKey="profile" title="Profile">
          <h5>Your Profile</h5>
          <p>Student ID: {studentId}</p>
          {/* Add edit profile form */}
        </Tab>
      </Tabs>
    </Container>
  );
};

export default StudentDashboard;