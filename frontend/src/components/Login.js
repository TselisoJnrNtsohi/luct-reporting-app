import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Container, Alert } from 'react-bootstrap';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/login', { username, password });
      localStorage.setItem('token', res.data.token);
      const rolePath = res.data.user.role.toLowerCase();
      navigate(`/${rolePath}`);
    } catch (err) {
      setError(err.response?.data.msg || 'Login failed');
    }
  };

  return (
    <Container className="mt-5">
      <h2>Login to LUCT System</h2>
      <Button variant="link" onClick={() => navigate('/')}>← Back to Home</Button>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleSubmit} className="form-container mt-3">
        <Form.Group className="mb-3">
          <Form.Label>Username</Form.Label>
          <Form.Control type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Password</Form.Label>
          <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Form.Group>
        <Button type="submit" className="btn-primary">Login</Button>
      </Form>
    </Container>
  );
};

export default Login;