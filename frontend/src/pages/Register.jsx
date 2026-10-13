import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosConfig';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Guidance only. The server owns the password policy and returns any failures
// in its `errors` array, so these rules are never checked here.
const PASSWORD_GUIDANCE = [
  'At least 8 characters',
  'A letter, a digit, and one of ! @ # $ % ? .',
  'Must not contain your username or the part of your email before @',
];

const FIELDS = [
  { key: 'username', type: 'text', placeholder: 'Username' },
  { key: 'firstName', type: 'text', placeholder: 'First name' },
  { key: 'lastName', type: 'text', placeholder: 'Last name' },
  { key: 'email', type: 'email', placeholder: 'Email' },
];

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [status, setStatus] = useState('idle'); // idle | error | success
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState([]);
  const [errorField, setErrorField] = useState(null);
  const navigate = useNavigate();

  const validate = () => {
    if (!formData.username.trim()) return 'Username is required.';
    if (!formData.firstName.trim()) return 'First name is required.';
    if (!formData.lastName.trim()) return 'Last name is required.';
    if (!EMAIL_REGEX.test(formData.email)) return 'Please enter a valid email address.';
    if (!formData.password) return 'Password is required.';
    return null;
  };

  const showError = (text, list = [], field = null) => {
    setStatus('error');
    setMessage(text);
    setErrors(list);
    setErrorField(field);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      showError(validationError);
      return;
    }

    try {
      await axiosInstance.post('/api/auth/register', formData);
      setStatus('success');
      setMessage('Registration successful. Redirecting to login...');
      setErrors([]);
      setErrorField(null);
      setTimeout(() => navigate('/login'), 1200);
    } catch (error) {
      const data = error.response?.data || {};
      if (error.response?.status === 409 && data.field === 'username') {
        showError(data.message || 'This username is already taken.', [], 'username');
      } else if (error.response?.status === 409) {
        showError('This email is already registered.', [], 'email');
      } else if (Array.isArray(data.errors) && data.errors.length > 0) {
        showError(data.message || 'Password does not meet the requirements.', data.errors, 'password');
      } else {
        showError(data.message || 'Registration failed. Please try again.');
      }
    }
  };

  const inputClass = (field, margin = 'mb-4') =>
    `w-full ${margin} p-2 border rounded ${errorField === field ? 'border-red-500' : ''}`;

  return (
    <div className="max-w-md mx-auto mt-20">
      <form onSubmit={handleSubmit} className="bg-white p-6 shadow-md rounded">
        <h1 className="text-2xl font-bold mb-4 text-center">Register</h1>

        {status === 'error' && (
          <div role="alert" className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            <p>{message}</p>
            {errors.length > 0 && (
              <ul className="mt-1 list-disc list-inside">
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {status === 'success' && (
          <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
            {message}
          </p>
        )}

        {FIELDS.map(({ key, type, placeholder }) => (
          <input
            key={key}
            type={type}
            placeholder={placeholder}
            aria-label={placeholder}
            aria-invalid={errorField === key}
            value={formData[key]}
            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
            disabled={status === 'success'}
            className={inputClass(key)}
          />
        ))}
        <input
          type="password"
          placeholder="Password"
          aria-label="Password"
          aria-describedby="password-guidance"
          aria-invalid={errorField === 'password'}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          disabled={status === 'success'}
          className={inputClass('password', 'mb-2')}
        />
        <ul id="password-guidance" className="mb-4 text-xs text-gray-600 list-disc list-inside">
          {PASSWORD_GUIDANCE.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <button
          type="submit"
          disabled={status === 'success'}
          className="w-full bg-green-600 text-white p-2 rounded disabled:opacity-50"
        >
          Register
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="text-blue-600">Log in</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
