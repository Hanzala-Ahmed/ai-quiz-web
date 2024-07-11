import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3001',
  headers: {
    authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

export default axiosInstance;
