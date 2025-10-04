import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="home-header">
        <Container>
          <Row className="align-items-center">
            <Col md={8}>
              <h1 className="display-4">Welcome to LUCT Faculty Reporting System</h1>
              <p className="lead">
                A web-based application designed for London University College of Technology (LUCT) to streamline lecture reporting, monitoring, and feedback across faculties.
              </p>
            </Col>
          </Row>
        </Container>
      </div>
      <Container className="home-container mt-3">
        <Row className="justify-content-center">
          <Col md={10} className="text-center">  {/* Full-width, centered text */}
            <p className="mb-4 fs-5">
              Lecturers can submit detailed reports on classes, while students, Principal Lecturers (PRL), and Program Leaders (PL) access monitoring tools, ratings, and admin features.
            </p>
            <h5 className="mb-4 text-primary fw-bold">Key Features:</h5>  {/* Purple accent via Bootstrap */}
            <ul className="list-unstyled mb-5">
              <li className="mb-3"><strong>Lecturer Module:</strong> Submit reports with attendance, topics, outcomes, and recommendations.</li>
              <li className="mb-3"><strong>Student Module:</strong> View lectures and provide ratings/feedback.</li>
              <li className="mb-3"><strong>PRL Module:</strong> Review reports, add feedback, and monitor streams.</li>
              <li className="mb-3"><strong>PL Module:</strong> Manage courses, assign classes, and oversee reports.</li>
              <li className="mb-3"><strong>Extra:</strong> Search across modules and export reports to Excel.</li>
            </ul>
            <div className="d-flex justify-content-center gap-3 flex-wrap">  {/* Centered CTAs */}
              <Button variant="primary" onClick={() => navigate('/login')}>
                Get Started - Login
              </Button>
              <Button variant="outline-secondary" onClick={() => navigate('/register')}>
                New User? Register
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default Home;