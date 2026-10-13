import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Account from './Account';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const LocationDisplay = () => {
  const location = useLocation();
  return <p>{location.pathname} {location.state?.message}</p>;
};

describe('Account', () => {
  const user = { id: 'user-1', name: 'Jasmine', email: 'jasmine@example.com', token: 'token-1' };
  const login = jest.fn();
  const logout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user, login, logout });
    axiosInstance.get.mockResolvedValue({
      data: {
        id: 'user-1',
        firstName: 'Jasmine',
        lastName: 'Jiang',
        email: 'jasmine@example.com',
        username: 'jasmine',
        createdAt: '2026-01-15T10:30:00.000Z',
        lastActivity: '2026-10-10T09:45:00.000Z',
      },
    });
  });

  it('loads and displays the authenticated user account', async () => {
    render(<MemoryRouter><Account /></MemoryRouter>);

    expect(await screen.findByText('Jasmine')).toBeInTheDocument();
    expect(screen.getByText('Jiang')).toBeInTheDocument();
    expect(screen.getByText('jasmine@example.com')).toBeInTheDocument();
    expect(screen.getByText('jasmine')).toBeInTheDocument();
    expect(screen.getByText('First name')).toBeInTheDocument();
    expect(screen.getByText('Last name')).toBeInTheDocument();
    expect(screen.getByText('Email address')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Registration date')).toBeInTheDocument();
    expect(screen.getByText('Last activity time')).toBeInTheDocument();
    expect(axiosInstance.get).toHaveBeenCalledWith('/api/auth/users/user-1/profile', {
      headers: { Authorization: 'Bearer token-1' },
    });
  });

  it('shows a clear value when an optional account detail is missing', async () => {
    axiosInstance.get.mockResolvedValue({
      data: {
        id: 'user-1',
        firstName: '',
        lastName: '',
        email: 'jasmine@example.com',
        username: '',
        createdAt: null,
        lastActivity: null,
      },
    });
    render(<MemoryRouter><Account /></MemoryRouter>);

    expect(await screen.findAllByText('Not provided')).toHaveLength(3);
    expect(screen.getAllByText('Not available')).toHaveLength(2);
  });

  it('pre-fills the edit form and displays saved account details', async () => {
    axiosInstance.put.mockResolvedValue({
      data: {
        id: 'user-1',
        firstName: 'Jasmine',
        lastName: 'Wang',
        email: 'jasmine.wang@example.com',
        username: 'jasminew',
        createdAt: '2026-01-15T10:30:00.000Z',
        lastActivity: '2026-10-10T09:45:00.000Z',
      },
    });
    render(<MemoryRouter><Account /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    expect(screen.getByLabelText('First name')).toHaveValue('Jasmine');
    expect(screen.getByLabelText('Last name')).toHaveValue('Jiang');
    expect(screen.getByLabelText('Registered email address')).toHaveValue('jasmine@example.com');
    expect(screen.getByLabelText('Username')).toHaveValue('jasmine');

    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Wang' } });
    fireEvent.change(screen.getByLabelText('Registered email address'), {
      target: { value: 'jasmine.wang@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'jasminew' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(axiosInstance.put).toHaveBeenCalledWith(
      '/api/auth/users/user-1/profile',
      {
        firstName: 'Jasmine',
        lastName: 'Wang',
        email: 'jasmine.wang@example.com',
        username: 'jasminew',
      },
      { headers: { Authorization: 'Bearer token-1' } }
    ));
    expect(login).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Jasmine Wang',
      email: 'jasmine.wang@example.com',
      username: 'jasminew',
    }));
    expect(await screen.findByText('Account details updated successfully.')).toBeInTheDocument();
    expect(screen.getByText('jasmine.wang@example.com')).toBeInTheDocument();
  });

  it('keeps the edit form open and displays server validation errors', async () => {
    axiosInstance.put.mockRejectedValue({
      response: { status: 409, data: { message: 'That email address is already registered' } },
    });
    render(<MemoryRouter><Account /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('That email address is already registered');
    expect(screen.getByLabelText('Registered email address')).toHaveValue('jasmine@example.com');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('warns before deletion and keeps the account when deletion is cancelled', async () => {
    render(<MemoryRouter><Account /></MemoryRouter>);

    expect(await screen.findByRole('button', { name: 'Edit details' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete account' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Delete account' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This action cannot be undone');
    expect(screen.getByLabelText('Current password')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(axiosInstance.delete).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
  });

  it('does not offer account deletion to administrators', async () => {
    useAuth.mockReturnValue({ user: { ...user, role: 'admin' }, login, logout });
    render(<MemoryRouter><Account /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));

    expect(screen.getByText('Administrator accounts cannot be deleted through the profile page.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete account' })).not.toBeInTheDocument();
  });

  it('logs the user out and confirms deletion after successful password verification', async () => {
    axiosInstance.delete.mockResolvedValue({ data: { message: 'Account deleted successfully' } });
    render(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete account' }));
    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'correct-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Permanently delete' }));

    await waitFor(() => expect(axiosInstance.delete).toHaveBeenCalledWith(
      '/api/auth/users/user-1/profile',
      {
        headers: { Authorization: 'Bearer token-1' },
        data: { currentPassword: 'correct-password' },
      }
    ));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('/login Your account has been deleted successfully.'))
      .toBeInTheDocument();
  });

  it('keeps the account active and allows retry after an incorrect password', async () => {
    axiosInstance.delete.mockRejectedValue({
      response: { status: 401, data: { message: 'Current password is incorrect' } },
    });
    render(<MemoryRouter><Account /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete account' }));
    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Permanently delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Permanently delete' })).toBeInTheDocument();
  });
});
