import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Container, Alert } from 'react-bootstrap';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '', password: '', role: 'Student', full_name: '', email: '', student_id: ''  // Removed stream
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/register', formData);
      alert('Registered! Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data.msg || 'Registration failed');
    }
  };

  return (
    <Container className="mt-5">
      <h2>Register for LUCT System</h2>
      <Button variant="link" onClick={() => navigate('/')}>← Back to Home</Button>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleSubmit} className="form-container mt-3">
        <Form.Group className="mb-3">
          <Form.Label>Username</Form.Label>
          <Form.Control type="text" name="username" onChange={handleChange} required />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Password</Form.Label>
          <Form.Control type="password" name="password" onChange={handleChange} required />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Role</Form.Label>
          <Form.Select name="role" onChange={handleChange}>
            <option value="Student">Student</option>
            <option value="Lecturer">Lecturer</option>
            <option value="PRL">PRL</option>
            <option value="PL">PL</option>
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Full Name</Form.Label>
          <Form.Control type="text" name="full_name" onChange={handleChange} required />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control type="email" name="email" onChange={handleChange} required />
        </Form.Group>
        {formData.role === 'Student' && (
          <Form.Group className="mb-3">
            <Form.Label>Student ID</Form.Label>
            <Form.Control type="text" name="student_id" onChange={handleChange} required />
          </Form.Group>
        )}
        <Button type="submit" className="btn-primary">Register</Button>
      </Form>
    </Container>
  );
};

export default Register;