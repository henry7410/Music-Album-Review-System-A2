import axios from 'axios';

const axiosInstance = axios.create({
  // Empty string = relative paths = same-origin requests. In production,
  // Express serves the API and the built frontend from one origin behind
  // nginx, so this works with no hardcoded host. In local dev, CRA's
  // "proxy" field (package.json) forwards relative requests from :3000 to
  // the backend on :5001. Set REACT_APP_API_URL to override either way.
  baseURL: process.env.REACT_APP_API_URL || '',
  // baseURL: 'http://15.134.129.43:5001',
  headers: { 'Content-Type': 'application/json' },
});

export default axiosInstance;
