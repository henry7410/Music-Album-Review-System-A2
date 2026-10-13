import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

const accountLabel = (account) =>
  account.username || [account.firstName, account.lastName].filter(Boolean).join(' ') || 'this user';

const AccountManagement = () => {
  const [status, setStatus] = useState('loading'); // loading | error | loaded
  const [message, setMessage] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null); // account awaiting confirmation
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
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

  const handleConfirmDelete = async () => {
    const account = pendingDelete;
    setPendingDelete(null);
    setActionError('');
    setActionSuccess('');
    setBusy(true);

    try {
      const response = await axiosInstance.delete(`/api/admin/accounts/${account.id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      // The endpoint returns the refreshed list, so no second request.
      setAccounts(response.data.accounts);
      setActionSuccess(`The account for ${accountLabel(account)} was permanently deleted.`);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Failed to delete account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const inactiveCount = accounts.filter((account) => account.inactive).length;

  return (
    <div className="max-w-5xl mx-auto mt-10 mb-20 px-4">
      <Link to="/" className="text-sm text-blue-600 mb-4 inline-block">
        ← Back to catalogue
      </Link>
      <h1 className="text-2xl font-bold mb-6">Account Management</h1>

      {pendingDelete && (
        // Inline elements only: ConfirmDialog renders the message inside a <p>.
        <ConfirmDialog
          message={
            <>
              Permanently delete the account for <strong>{accountLabel(pendingDelete)}</strong>?
              <span className="block mt-3 text-sm text-gray-700">
                Last active {formatDate(pendingDelete.lastActivity)}. Their reviews, flags and personal
                details will be removed.
              </span>
              <span className="block mt-3 font-semibold">This deletion is permanent and cannot be undone.</span>
            </>
          }
          confirmLabel="Delete account"
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {actionError && (
        <p role="alert" className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {actionError}
        </p>
      )}
      {actionSuccess && (
        <p role="status" className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
          {actionSuccess}
        </p>
      )}

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
            {inactiveCount > 0 && (
              <>
                {' · '}
                <span className="text-red-700">
                  {inactiveCount} inactive for more than 5 years (highlighted in red)
                </span>
              </>
            )}
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
                  <th scope="col" className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr
                    key={account.id}
                    className={`border-t ${account.inactive ? 'bg-red-50 text-red-900' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium">{account.username || '—'}</td>
                    <td className="px-4 py-3">{account.firstName || '—'}</td>
                    <td className="px-4 py-3">{account.lastName || '—'}</td>
                    <td className="px-4 py-3 capitalize">{account.role}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(account.registeredAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(account.lastActivity)}
                      {account.inactive && <span className="block text-xs font-semibold">Inactive 5+ years</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {account.deletable && (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(account)}
                          disabled={busy}
                          aria-label={`Delete account ${accountLabel(account)}`}
                          className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </td>
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
