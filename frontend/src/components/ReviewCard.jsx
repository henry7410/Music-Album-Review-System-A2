import { useState } from 'react';

import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';
import ConfirmDialog from './ConfirmDialog';
import ReviewFields, { validateReviewStars } from './ReviewFields';

const ReviewCard = ({ review, onUpdated, onDeleted, onFlagged }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [stars, setStars] = useState(review.stars);
  const [comment, setComment] = useState(review.comment);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagSubmitting, setFlagSubmitting] = useState(false);

  const startEditing = () => {
    setStars(review.stars);
    setComment(review.comment);
    setError('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setError('');
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateReviewStars(stars);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const response = await axiosInstance.put(
        `/api/reviews/${review._id}`,
        { stars, comment },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      onUpdated(response.data);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteDialogOpen(false);
    setError('');
    setDeleting(true);
    try {
      const response = await axiosInstance.delete(`/api/reviews/${review._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      onDeleted(review._id, response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete review. Please try again.');
      setDeleting(false);
    }
  };

  const handleFlagSubmit = async () => {
    if (!flagReason) {
      setError('Please select a reason.');
      return;
    }

    try {
      setFlagSubmitting(true);

      await axiosInstance.post(
        '/api/flagged-reviews',
        {
          reviewId: review._id,
          reason: flagReason,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      setFlagDialogOpen(false);
      setFlagReason('');
      onFlagged(review._id);
      alert('Review reported successfully.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to report review.'
      );
    } finally {
      setFlagSubmitting(false);
    }
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="py-3">
        {error && (
          <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </p>
        )}

        <ReviewFields
          stars={stars}
          onStarsChange={setStars}
          comment={comment}
          onCommentChange={setComment}
          disabled={submitting}
        />

        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            disabled={submitting}
            className="px-4 py-2 border rounded text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="py-3">
      {deleteDialogOpen && (
        <ConfirmDialog
          message="Delete this review? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteDialogOpen(false)}
        />
      )}

      {flagDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">
              Report Review
            </h2>

            <select
              value={flagReason}
              onChange={(e) => {
              setFlagReason(e.target.value);
              setError('');
              }}
              className="w-full border rounded p-2"
            >
              <option value="">
                Select a reason
              </option>

              <option value="Rude">
                Rude
              </option>

              <option value="Spam">
                Spam
              </option>

              <option value="Unrelated to Music Album">
                Unrelated to Music Album
              </option>
            </select>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setFlagDialogOpen(false);
                  setFlagReason('');
                  setError('');
                }}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleFlagSubmit}
                disabled={flagSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}



      {error && (
        <p className="mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {review.userName}
        </span>

        <div className="flex items-center gap-1">
          <span
            className="text-yellow-400"
            aria-label={`${review.stars} out of 5 stars`}
          >
            {'★'.repeat(review.stars)}
            <span className="text-gray-300">
              {'★'.repeat(5 - review.stars)}
            </span>
          </span>

          {review.isOwn ? (
            <span className="invisible">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M4 2v20h2v-8h10l-2.5-4L16 6H6V2H4z" />
              </svg>
            </span>
          ) : review.isFlagged ? (
            <span
              className="text-gray-400 cursor-not-allowed"
              title="Already Reported"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M4 2v20h2v-8h10l-2.5-4L16 6H6V2H4z" />
              </svg>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setFlagDialogOpen(true)}
              className="text-red-500 hover:text-red-700"
              title="Report Review"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M4 2v20h2v-8h10l-2.5-4L16 6H6V2H4z" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {review.comment && <p className="text-sm text-gray-700 mt-1">{review.comment}</p>}
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
        {review.isOwn && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={startEditing}
              disabled={deleting}
              className="text-xs text-blue-600 disabled:opacity-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleting}
              className="text-xs text-red-600 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCard;
