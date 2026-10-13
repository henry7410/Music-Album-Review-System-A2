import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';
import EmptyState from '../components/EmptyState';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

const AccountManagement = () => {
  const [status, setStatus] = useState('loading'); // loading | error | loaded
  const [message, setMessage] = useState('');
  const [accounts, setAccounts] = useState([]);
  const { user } = useAuth();

  // Fetched fresh every time the page is opened, so new, edited, and deleted
  // accounts are always reflected.
  useEffect(() => {
    const loadAccounts = async () => {
      setStatus('loading');
      try {
        const response = await axiosInstance.get('/api/admin/accounts', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setAccounts(response.data);
        setStatus('loaded');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Failed to load user accounts.');
      }
    };

    loadAccounts();
  }, [user.token]);

  return (
    <div className="max-w-5xl mx-auto mt-10 mb-20 px-4">
      <Link to="/" className="text-sm text-blue-600 mb-4 inline-block">
        ← Back to catalogue
      </Link>
      <h1 className="text-2xl font-bold mb-6">Account Management</h1>

      {status === 'loading' && <p className="text-center text-gray-500">Loading user accounts...</p>}

      {status === 'error' && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {message}
        </p>
      )}

      {status === 'loaded' && accounts.length === 0 && (
        <EmptyState message="There are no registered user accounts." />
      )}

      {status === 'loaded' && accounts.length > 0 && (
        <>
          <p className="text-sm text-gray-600 mb-3">
            {accounts.length} registered {accounts.length === 1 ? 'account' : 'accounts'}
          </p>
          <div className="bg-white shadow-md rounded overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Username</th>
                  <th scope="col" className="px-4 py-3 font-semibold">First name</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Last name</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Registered</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{account.username || '—'}</td>
                    <td className="px-4 py-3">{account.firstName || '—'}</td>
                    <td className="px-4 py-3">{account.lastName || '—'}</td>
                    <td className="px-4 py-3 capitalize">{account.role}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(account.registeredAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(account.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AccountManagement;
