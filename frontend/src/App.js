import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import LecturerDashboard from './components/LecturerDashboard';
import PRLDashboard from './components/PRLDashboard';
import PLDashboard from './components/PLDashboard';
import StudentDashboard from './components/StudentDashboard';
import './App.css';

function Navbar() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setRole(decoded.role);
      } catch (err) {
        setToken(null);
      }
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setRole('');
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light mb-4">
      <div className="container">
        <Link className="navbar-brand" to="/">LUCT Reporting System</Link>
        <div className="navbar-nav ms-auto">
          {token ? (
            <>
              <Link className="nav-link" to={`/${role.toLowerCase()}`}>Dashboard</Link>
              <button className="nav-link btn btn-link" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link className="nav-link" to="/login">Login</Link>
              <Link className="nav-link" to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/lecturer" element={<ProtectedRoute component={LecturerDashboard} role="Lecturer" />} />
          <Route path="/prl" element={<ProtectedRoute component={PRLDashboard} role="PRL" />} />
          <Route path="/pl" element={<ProtectedRoute component={PLDashboard} role="PL" />} />
          <Route path="/student" element={<ProtectedRoute component={StudentDashboard} role="Student" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

// Protected Route Helper
function ProtectedRoute({ component: Component, role }) {
  const token = localStorage.getItem('token');
  let userRole = '';
  if (token) {
    try {
      userRole = JSON.parse(atob(token.split('.')[1])).role;
    } catch (err) {
      localStorage.removeItem('token');
    }
  }
  return token && userRole === role ? <Component /> : <Navigate to="/" />;
}

export default App;