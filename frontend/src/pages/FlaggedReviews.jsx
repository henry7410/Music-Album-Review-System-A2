import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';
import EmptyState from '../components/EmptyState';

const STARS = [1, 2, 3, 4, 5];

const FlaggedReviews = () => {
  const [status, setStatus] = useState('loading'); // loading | error | loaded
  const [message, setMessage] = useState('');
  const [rows, setRows] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const loadFlaggedReviews = async () => {
      setStatus('loading');
      try {
        const response = await axiosInstance.get('/api/admin/flagged-reviews', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setRows(response.data);
        setStatus('loaded');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Failed to load flagged reviews.');
      }
    };

    loadFlaggedReviews();
  }, [user.token]);

  return (
    <div className="max-w-4xl mx-auto mt-10 mb-20 px-4">
      <Link to="/" className="text-sm text-blue-600 mb-4 inline-block">
        ← Back to catalogue
      </Link>
      <h1 className="text-2xl font-bold mb-6">Flagged Reviews</h1>

      {status === 'loading' && <p className="text-center text-gray-500">Loading flagged reviews...</p>}

      {status === 'error' && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {message}
        </p>
      )}

      {status === 'loaded' && rows.length === 0 && (
        <EmptyState message="No reviews are waiting for moderation." />
      )}

      {status === 'loaded' && rows.length > 0 && (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.reviewId} className="bg-white p-6 shadow-md rounded">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  {row.albumId ? (
                    <Link to={`/albums/${row.albumId}`} className="font-semibold text-blue-600 hover:underline">
                      {row.albumTitle}
                    </Link>
                  ) : (
                    <span className="font-semibold text-gray-500">{row.albumTitle}</span>
                  )}
                  {row.albumId && <p className="text-sm text-gray-600">{row.artistName}</p>}
                </div>
                <span className="shrink-0 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                  {row.flagCount} {row.flagCount === 1 ? 'flag' : 'flags'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {row.reasons.map(({ reason, count }) => (
                  <span key={reason} className="text-xs text-gray-700 bg-gray-100 border border-gray-200 rounded px-2 py-1">
                    {reason} × {count}
                  </span>
                ))}
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.authorName}</span>
                  <span aria-label={`${row.stars} out of 5 stars`}>
                    {STARS.map((star) => (
                      <span key={star} className={star <= row.stars ? 'text-yellow-400' : 'text-gray-300'}>
                        ★
                      </span>
                    ))}
                  </span>
                </div>
                {row.comment && <p className="text-gray-700 mt-1">{row.comment}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Reviewed {new Date(row.createdAt).toLocaleDateString()} · Last flagged{' '}
                  {new Date(row.latestFlaggedAt).toLocaleDateString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FlaggedReviews;
