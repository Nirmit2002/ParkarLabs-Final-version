// pages/auth/login.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';

export default function Login() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        redirectBasedOnRole(response.data.user.role);
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const redirectBasedOnRole = (role) => {
    switch (role) {
      case 'admin':
        router.push('/admin/dashboard');
        break;
      case 'manager':
        router.push('/admin/dashboard');
        break;
      case 'employee':
        router.push('/user/dashboard');
        break;
      default:
        router.push('/user/dashboard');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (isLogin) {
      // Login
      try {
        const response = await axios.post('/api/auth/login', {
          email: formData.email,
          password: formData.password
        });

        if (response.data.success) {
          localStorage.setItem('token', response.data.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));

          setSuccess('Login successful! Redirecting...');
          setTimeout(() => {
            redirectBasedOnRole(response.data.data.user.role);
          }, 1000);
        }
      } catch (error) {
        console.error('Login error:', error);
        setError(
          error.response?.data?.message ||
          'Login failed. Please check your credentials.'
        );
      }
    } else {
      // Registration
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.post('/api/auth/register', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        });

        if (response.data.success) {
          setSuccess('Account created successfully! Please login.');
          // Switch to login form and clear form data
          setTimeout(() => {
            setIsLogin(true);
            setFormData({
              name: '',
              email: formData.email, // Keep email for convenience
              password: '',
              confirmPassword: ''
            });
            setSuccess('');
          }, 2000);
        }
      } catch (error) {
        console.error('Registration error:', error);
        setError(
          error.response?.data?.message ||
          'Registration failed. Please try again.'
        );
      }
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        {/* Single text node in title to avoid array children warning */}
        <title>{isLogin ? 'Login - ParkarLabs' : 'Sign Up - ParkarLabs'}</title>
        <meta name="description" content={isLogin ? 'Sign in to ParkarLabs platform' : 'Create your ParkarLabs account'} />
      </Head>

      <div className="min-h-screen bg-white font-sans">
        <div className="flex min-h-screen">
          {/* Left Side - Blue Section */}
          <div className="flex-1 bg-[#0a0e27] text-white flex items-center justify-center px-8 lg:px-16">
            <div className="max-w-lg">
              <h1 className="text-4xl font-bold mb-6 leading-tight">
                Welcome to <span className="text-blue-500">ParkarLabs</span>
              </h1>
              <p className="text-lg text-gray-300 mb-8">
                Empowering digital transformation with innovative solutions and unparalleled expertise.
                Discover how Parkar Labs is reshaping industries through cutting-edge technology.
              </p>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="text-2xl">🚀</div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Cloud Labs</h3>
                    <p className="text-gray-300">
                      Spin up containers instantly and test in real-time sandbox environments.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-2xl">📚</div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Learn & Upskill</h3>
                    <p className="text-gray-300">
                      Access structured courses and tutorials tailored for hands-on learning.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-2xl">🔍</div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Analytics Dashboard</h3>
                    <p className="text-gray-300">
                      Track your lab usage, performance metrics, and learning progress in one place.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login/Signup Form */}
          <div className="flex-1 bg-white flex items-center justify-center px-8 lg:px-16">
            <div className="w-full max-w-md">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 text-center">
                {isLogin ? 'Login' : 'Sign Up'}
              </h2>

              <form onSubmit={handleSubmit}>
                {!isLogin && (
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-gray-700">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      placeholder="John Doe"
                      required={!isLogin}
                    />
                  </div>
                )}

                <div className="mb-6">
                  <label className="block mb-2 font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block mb-2 font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="••••••••"
                    required
                  />
                </div>

                {!isLogin && (
                  <div className="mb-6">
                    <label className="block mb-2 font-medium text-gray-700">Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      placeholder="••••••••"
                      required={!isLogin}
                    />
                  </div>
                )}

                {error && (
                  <div className="text-red-500 text-sm mb-4 text-center bg-red-50 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="text-green-500 text-sm mb-4 text-center bg-green-50 p-3 rounded-lg">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-medium transition"
                >
                  {loading ? (isLogin ? 'Signing In...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Create Account')}
                </button>
              </form>

              <div className="mt-8 space-y-4">
                <div className="text-center text-sm text-gray-600">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                      setSuccess('');
                      setFormData({
                        name: '',
                        email: '',
                        password: '',
                        confirmPassword: ''
                      });
                    }}
                    className="text-blue-600 font-medium hover:text-blue-500 transition"
                  >
                    {isLogin ? 'Sign up' : 'Login'}
                  </button>
                </div>

                {isLogin && (
                  <div className="text-center">
                    <Link
                      href="/forgot-password"
                      className="text-sm text-gray-500 hover:text-blue-600 transition underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                )}

                <div className="text-center">
                  <Link
                    href="/"
                    className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition"
                  >
                    <span className="mr-1">←</span> Back to Homepage
                  </Link>
                </div>

                {/* Demo Credentials */}
                {isLogin && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-800 mb-2">Demo Credentials:</p>
                    <div className="text-xs text-blue-600 space-y-1">
                      <p>Email: admin@local | Password: temp123 (Admin)</p>
                      <p>Email: test1@example.com | Password: temp123 (Employee)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
