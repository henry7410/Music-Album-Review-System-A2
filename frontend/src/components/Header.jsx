import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axiosInstance.post(
        '/api/auth/logout',
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
    } catch (error) {
      // Token is discarded client-side regardless of whether the request succeeded.
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <header className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
      <span className="font-bold">MARS</span>
      <div className="flex items-center gap-3">
        <span className="text-sm">{user.role === 'admin' ? 'Admin' : user.name}</span>
        <Link to="/account" className="text-sm hover:underline">
          My Account
        </Link>
        <button onClick={handleLogout} className="bg-gray-700 px-3 py-1 rounded text-sm">
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
