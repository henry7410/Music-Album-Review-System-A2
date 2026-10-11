import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Account from './Account';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn() },
}));

describe('Account', () => {
  const user = { id: 'user-1', name: 'Jasmine', email: 'jasmine@example.com', token: 'token-1' };
  const login = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user, login });
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
});
