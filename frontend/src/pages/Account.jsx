import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const Account = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
  });
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setStatus('loading');
      try {
        const response = await axiosInstance.get(`/api/auth/users/${user.id}/profile`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setProfile(response.data);
        setForm({
          firstName: response.data.firstName || '',
          lastName: response.data.lastName || '',
          email: response.data.email || '',
          username: response.data.username || '',
        });
        setStatus('loaded');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to load account information.');
        setStatus('error');
      }
    };

    loadProfile();
  }, [user.id, user.token]);

  const formatDateTime = (value) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const detailRows = [
    ['First name', profile?.firstName || 'Not provided'],
    ['Last name', profile?.lastName || 'Not provided'],
    ['Email address', profile?.email || 'Not provided'],
    ['Username', profile?.username || 'Not provided'],
    ['Registration date', formatDateTime(profile?.createdAt)],
    ['Last activity time', formatDateTime(profile?.lastActivity)],
  ];

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleCancel = () => {
    setForm({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      email: profile.email || '',
      username: profile.username || '',
    });
    setEditing(false);
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      const response = await axiosInstance.put(`/api/auth/users/${user.id}/profile`, form, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setProfile(response.data);
      setForm({
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        email: response.data.email || '',
        username: response.data.username || '',
      });
      login({
        ...user,
        name: `${response.data.firstName} ${response.data.lastName}`.trim(),
        email: response.data.email,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        username: response.data.username,
      });
      setEditing(false);
      setMessageType('success');
      setMessage('Account details updated successfully.');
    } catch (error) {
      setMessageType('error');
      setMessage(error.response?.data?.message || 'Unable to update account information.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubmit = async (event) => {
    event.preventDefault();
    setDeleteError('');
    setDeleting(true);
    try {
      await axiosInstance.delete(`/api/auth/users/${user.id}/profile`, {
        headers: { Authorization: `Bearer ${user.token}` },
        data: { currentPassword },
      });
      logout();
      navigate('/login', {
        replace: true,
        state: { message: 'Your account has been deleted successfully.' },
      });
    } catch (error) {
      setDeleteError(error.response?.data?.message || 'Unable to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto mt-10 mb-20 px-4">
      <Link to="/" className="text-sm text-blue-600 mb-4 inline-block">
        ← Back to catalogue
      </Link>

      <section className="bg-white p-6 shadow-md rounded">
        <h1 className="text-2xl font-bold mb-2">My Account</h1>
        <p className="text-sm text-gray-500 mb-6">
          {editing ? 'Update your account details.' : 'View your account details.'}
        </p>

        {status === 'loading' && <p className="text-gray-500">Loading account information...</p>}
        {status === 'error' && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {message}
          </p>
        )}
        {status === 'loaded' && message && (
          <p
            role={messageType === 'error' ? 'alert' : 'status'}
            className={`text-sm rounded p-2 mb-4 ${
              messageType === 'success'
                ? 'text-green-700 bg-green-50 border border-green-200'
                : 'text-red-600 bg-red-50 border border-red-200'
            }`}
          >
            {message}
          </p>
        )}

        {status === 'loaded' && (
          <>
            {editing ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    First name
                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      required
                      className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Last name
                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      required
                      className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Registered email address
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Username
                    <input
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="mt-5 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded"
                    >
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="mt-5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 px-4 py-2 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                <section className="mt-8 pt-6 border-t border-red-200">
                  <h2 className="font-semibold text-red-700">Delete account</h2>
                  <p className="text-sm text-gray-600 mt-2">
                    Permanently delete your account and personal data. This action cannot be undone.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPassword('');
                      setDeleteError('');
                      setDeleteDialogOpen(true);
                    }}
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                  >
                    Delete account
                  </button>
                </section>
              </>
            ) : (
              <>
                <dl className="divide-y">
                  {detailRows.map(([label, value]) => (
                    <div key={label} className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-medium text-gray-600">{label}</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  onClick={() => {
                    setMessage('');
                    setEditing(true);
                  }}
                  className="mt-5 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded"
                >
                  Edit details
                </button>
              </>
            )}
          </>
        )}
      </section>

      {deleteDialogOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setDeleteDialogOpen(false);
              setDeleteError('');
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="bg-white rounded shadow-md p-6 max-w-md w-full"
          >
            <h2 id="delete-account-title" className="text-lg font-bold text-red-700">
              Permanently delete your account?
            </h2>
            <p className="text-sm text-gray-700 my-4">
              This permanently removes your account, reviews, and personal data. Enter your current
              password to confirm. This action cannot be undone.
            </p>
            {deleteError && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-4">
                {deleteError}
              </p>
            )}
            <form onSubmit={handleDeleteSubmit}>
              <label className="block text-sm font-medium text-gray-700">
                Current password
                <input
                  type="password"
                  name="currentPassword"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  disabled={deleting}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
              </label>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setDeleteError('');
                  }}
                  disabled={deleting}
                  className="px-4 py-2 rounded border border-gray-300 text-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting || !currentPassword}
                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Permanently delete'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
};

export default Account;
