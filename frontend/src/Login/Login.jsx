import React, { useState, useContext } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import config from '../config/config';
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from '../AuthContext'; // Import AuthContext

const LoginModal = ({ closeModal }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setAccessToken, setUser } = useContext(AuthContext); // Use context setters

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError('');
      const response = await axios.post(`${config.backendUrl}/login`, { email, password });

      if (response.status === 200) {
        localStorage.setItem('accessToken', response.data.data.accessToken);
        localStorage.setItem('refreshToken', response.data.data.refreshToken);
        localStorage.setItem('userData', JSON.stringify(response.data.data.user));

        if (response.data.data.user.role === "user") {
          navigate("/dash");
        } else if (response.data.data.user.role === "admin") {
          navigate('/admin/dashboard');
        }
        closeModal();
      }
    } catch (error) {
      console.error('Login failed:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Invalid email or password';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Login</h2>
          <button onClick={closeModal} className="text-gray-300 hover:text-gray-100 focus:outline-none">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <input 
              type="email"
              placeholder="Enter your email" 
              className="w-full rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-2.5" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
            />
          </div>

          <div>
            <input 
              type="password"
              placeholder="Enter your password" 
              className="w-full rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-2.5" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-700 hover:opacity-90 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-transform transform hover:scale-105 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </>
            ) : (
              'Log In'
            )}
          </button>

          <div className="flex justify-between items-center mt-4">
            <Link 
              to="/forget-password" 
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Forgot password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
