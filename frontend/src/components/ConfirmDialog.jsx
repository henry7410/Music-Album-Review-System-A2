// 'danger' (default) for destructive actions; 'neutral' for ones that destroy nothing.
const CONFIRM_STYLES = {
  danger: 'bg-red-600 text-white',
  neutral: 'bg-gray-800 text-white',
};

const ConfirmDialog = ({ message, confirmLabel = 'Confirm', variant = 'danger', onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-md p-6 max-w-sm w-full">
        <p className="text-gray-800 mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded ${CONFIRM_STYLES[variant] || CONFIRM_STYLES.danger}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
