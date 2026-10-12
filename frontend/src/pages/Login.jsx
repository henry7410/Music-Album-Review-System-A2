import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosConfig';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [status, setStatus] = useState('idle'); // idle | error | success
  const [message, setMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axiosInstance.post('/api/auth/login', formData);
      login(response.data);
      setStatus('success');
      setMessage('Login successful. Redirecting...');
      setTimeout(() => navigate('/'), 800);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Invalid email or password.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <form onSubmit={handleSubmit} className="bg-white p-6 shadow-md rounded">
        <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>

        {location.state?.message && (
          <p role="status" className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
            {location.state.message}
          </p>
        )}
        {status === 'error' && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {message}
          </p>
        )}
        {status === 'success' && (
          <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
            {message}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          disabled={status === 'success'}
          className="w-full mb-4 p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          disabled={status === 'success'}
          className="w-full mb-4 p-2 border rounded"
        />
        <button
          type="submit"
          disabled={status === 'success'}
          className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
        >
          Login
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          No account yet? <Link to="/register" className="text-blue-600">Register</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
