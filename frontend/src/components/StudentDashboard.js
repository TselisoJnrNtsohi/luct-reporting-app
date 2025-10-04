import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Table, Container, Modal, InputGroup, FormControl, Alert, Row, Col } from 'react-bootstrap';

const StudentDashboard = () => {
  const [lectures, setLectures] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [ratingData, setRatingData] = useState({ rating: 1, feedback: '' });  // Renamed to feedback
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchLectures();
  }, []);

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
        comments: ratingData.feedback  // Sent as comments in backend
      }, config);
      setShowModal(false);
      setRatingData({ rating: 1, feedback: '' });
      fetchRatings(selectedLecture.id);
      fetchLectures();  // Refresh avg ratings
      alert('Feedback and rating added!');
    } catch (err) {
      setError('Rating failed');
    }
  };

  const handleSearch = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/search/lectures?q=${searchQuery}`, config);
      setLectures(res.data);
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
        <Col><h2>Student Dashboard - View Lectures & Provide Feedback</h2></Col>
        <Col className="text-end"><Button variant="outline-danger" onClick={logout}>Logout</Button></Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      <InputGroup className="mb-3">
        <FormControl placeholder="Search lectures..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <Button onClick={handleSearch}>Search</Button>
      </InputGroup>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>Faculty</th>
            <th>Course</th>
            <th>Class</th>
            <th>Lecturer</th>
            <th>Topic</th>
            <th>Date</th>
            <th>Avg Rating</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {lectures.map(lecture => (
            <tr key={lecture.id}>
              <td>{lecture.id}</td>
              <td>{lecture.faculty_name}</td>
              <td>{lecture.course_name}</td>
              <td>{lecture.class_name}</td>
              <td>{lecture.lecturer_name}</td>
              <td>{lecture.topic_taught}</td>
              <td>{lecture.date_of_lecture}</td>
              <td>{lecture.avg_rating ? lecture.avg_rating.toFixed(1) : 'N/A'}</td>
              <td>
                <Button 
                  size="sm" 
                  variant="success" 
                  onClick={() => { 
                    setSelectedLecture(lecture); 
                    fetchRatings(lecture.id); 
                    setShowModal(true); 
                  }}
                >
                  Rate & Feedback
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Rate & Feedback for Lecture {selectedLecture?.id} - {selectedLecture?.topic_taught}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLecture && (
            <div className="mb-3">
              <h6><strong>Details:</strong></h6>
              <p><strong>Faculty:</strong> {selectedLecture.faculty_name} | <strong>Course:</strong> {selectedLecture.course_name}</p>
              <p><strong>Lecturer:</strong> {selectedLecture.lecturer_name} | <strong>Date:</strong> {selectedLecture.date_of_lecture}</p>
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
              <Form.Label>Feedback (Comments)</Form.Label>
              <Form.Control as="textarea" value={ratingData.feedback} onChange={(e) => setRatingData({ ...ratingData, feedback: e.target.value })} placeholder="Share your thoughts on the lecture..." />
            </Form.Group>
            <Button type="submit" className="btn-success">Submit Rating & Feedback</Button>
          </Form>
          {ratings.length > 0 && (
            <>
              <h5 className="mt-4">Previous Feedback & Ratings:</h5>
              <Table size="sm">
                <tbody>
                  {ratings.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.rating}/5</strong> - {r.comments || 'No feedback'}</td>
                      <td className="text-muted small">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default StudentDashboard;