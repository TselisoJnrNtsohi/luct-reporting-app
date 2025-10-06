import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Table, Container, Modal, InputGroup, FormControl, Alert, Row, Col } from 'react-bootstrap';

const PRLDashboard = () => {
  const [reports, setReports] = useState([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await axios.get('https://backend-placeholder.onrender.com/api/reports/PRL?faculty_id=1', config); // Adjust faculty_id
      setReports(res.data);
    } catch (err) {
      setError('Failed to fetch reports');
    }
  };

  const handleFeedback = async (lectureId) => {
    try {
      await axios.post('https://backend-placeholder.onrender.com/api/feedback', { lecture_id: lectureId, feedback_text: feedbackText }, config);
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
      const res = await axios.get(`https://backend-placeholder.onrender.com/api/search/lectures?q=${searchQuery}`, config);
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
        <Col><h2>PRL Dashboard - Reports & Feedback</h2></Col>
        <Col className="text-end"><Button variant="outline-danger" onClick={logout}>Logout</Button></Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
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
                <Button size="sm" className="ms-1" onClick={() => window.open(`https://backend-placeholder.onrender.com/api/export/reports/${report.id}`, '_blank')}>Export</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

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