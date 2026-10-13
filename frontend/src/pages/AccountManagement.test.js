import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountManagement from './AccountManagement';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), delete: jest.fn() },
}));

const activeAccount = {
  id: 'user-1',
  username: 'jasmine',
  firstName: 'Jasmine',
  lastName: 'Jiang',
  role: 'user',
  registeredAt: '2026-01-15T10:30:00.000Z',
  lastActivity: '2026-10-10T09:45:00.000Z',
  inactive: false,
  deletable: false,
};

const inactiveAccount = {
  id: 'user-2',
  username: 'inactive_demo_1',
  firstName: 'Inactive',
  lastName: 'Demo',
  role: 'user',
  registeredAt: '2019-03-01T00:00:00.000Z',
  lastActivity: '2020-03-01T00:00:00.000Z',
  inactive: true,
  deletable: true,
};

const renderPage = () => render(<MemoryRouter><AccountManagement /></MemoryRouter>);

describe('AccountManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'admin-1', role: 'admin', token: 'token-1' } });
    axiosInstance.get.mockResolvedValue({ data: [activeAccount, inactiveAccount] });
  });

  it('lists every account with its details', async () => {
    renderPage();

    expect(await screen.findByText('jasmine')).toBeInTheDocument();
    expect(screen.getByText('inactive_demo_1')).toBeInTheDocument();
    expect(screen.getByText(/2 registered accounts/)).toHaveTextContent(
      '1 inactive for more than 5 years (highlighted in red)'
    );
  });

  it('highlights inactive accounts in red and offers Delete only for them', async () => {
    renderPage();

    const inactiveRow = (await screen.findByText('inactive_demo_1')).closest('tr');
    const activeRow = screen.getByText('jasmine').closest('tr');

    expect(inactiveRow).toHaveClass('bg-red-50');
    expect(activeRow).not.toHaveClass('bg-red-50');
    expect(within(inactiveRow).getByRole('button', { name: /delete account/i })).toBeInTheDocument();
    expect(within(activeRow).queryByRole('button')).not.toBeInTheDocument();
  });

  it('warns that deletion is permanent and deletes nothing when cancelled', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete account inactive_demo_1' }));
    expect(screen.getByText('This deletion is permanent and cannot be undone.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('This deletion is permanent and cannot be undone.')).not.toBeInTheDocument();
    expect(axiosInstance.delete).not.toHaveBeenCalled();
    expect(screen.getByText('inactive_demo_1')).toBeInTheDocument();
  });

  it('deletes the account after confirmation and removes it from the list', async () => {
    axiosInstance.delete.mockResolvedValue({ data: { message: 'Account deleted', accounts: [activeAccount] } });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete account inactive_demo_1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'The account for inactive_demo_1 was permanently deleted.'
    );
    expect(axiosInstance.delete).toHaveBeenCalledWith('/api/admin/accounts/user-2', {
      headers: { Authorization: 'Bearer token-1' },
    });
    expect(screen.queryByText('inactive_demo_1')).not.toBeInTheDocument();
    expect(screen.getByText('jasmine')).toBeInTheDocument();
  });

  it('shows the server reason when a deletion is refused', async () => {
    axiosInstance.delete.mockRejectedValue({
      response: { data: { message: 'Only accounts inactive for more than 5 years can be deleted' } },
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete account inactive_demo_1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only accounts inactive for more than 5 years can be deleted'
    );
    expect(screen.getByText('inactive_demo_1')).toBeInTheDocument();
  });
});
