import { render, screen } from '@testing-library/react';
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

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user });
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
    expect(screen.getByText('Registered email address')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Registration date')).toBeInTheDocument();
    expect(screen.getByText('Last activity time')).toBeInTheDocument();
    expect(axiosInstance.get).toHaveBeenCalledWith('/api/auth/profile', {
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
});
