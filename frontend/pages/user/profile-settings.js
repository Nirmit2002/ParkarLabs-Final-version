import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../styles/ProfileSettings.module.css';

export default function ProfileSettings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    email: ''
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Profile picture state
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  // Role state
  const [selectedRole, setSelectedRole] = useState('');
  const [roles, setRoles] = useState([]);

  // Toast/message state
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    fetchProfile();
    fetchRoles();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data);
        setProfileData({
          name: data.data.name,
          email: data.data.email
        });
        setSelectedRole(data.data.roleId);
        setProfilePicPreview(data.data.profilePic ? data.data.profilePic : null);
      } else {
        showToast('Failed to load profile', 'error');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showToast('Error loading profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/roles', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (data.success) {
        showToast('Profile updated successfully', 'success');
        fetchProfile();
      } else {
        showToast(data.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Error updating profile', 'error');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(passwordData)
      });

      const data = await response.json();

      if (data.success) {
        showToast('Password changed successfully', 'success');
        setPasswordData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        showToast(data.message || 'Failed to change password', 'error');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showToast('Error changing password', 'error');
    }
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showToast('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'error');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
      }

      setProfilePic(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleProfilePicUpload = async () => {
    if (!profilePic) {
      showToast('Please select an image first', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('profilePic', profilePic);

      const response = await fetch('/api/profile/picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        showToast('Profile picture updated successfully', 'success');
        setProfilePic(null);
        fetchProfile();
      } else {
        showToast(data.message || 'Failed to upload profile picture', 'error');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      showToast('Error uploading profile picture', 'error');
    }
  };

  const handleRoleUpdate = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/profile/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role_id: parseInt(selectedRole) })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Role updated successfully', 'success');
        fetchProfile();
      } else {
        showToast(data.message || 'Failed to update role', 'error');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      showToast('Error updating role', 'error');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Profile Settings - ParkarLabs</title>
      </Head>

      <div className={styles.container}>
        {/* Toast Notification */}
        {toast.show && (
          <div className={`${styles.toast} ${styles[toast.type]}`}>
            {toast.message}
          </div>
        )}

        <div className={styles.header}>
          <h1>Profile Settings</h1>
          <button onClick={() => router.push('/user/dashboard')} className={styles.backButton}>
            Back to Dashboard
          </button>
        </div>

        {/* Profile Picture Section */}
        <div className={styles.profilePicSection}>
          <div className={styles.profilePicContainer}>
            {profilePicPreview ? (
              <img src={profilePicPreview} alt="Profile" className={styles.profilePic} />
            ) : (
              <div className={styles.profilePicPlaceholder}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className={styles.profilePicActions}>
            <input
              type="file"
              id="profilePicInput"
              accept="image/*"
              onChange={handleProfilePicChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="profilePicInput" className={styles.selectButton}>
              Select Photo
            </label>
            {profilePic && (
              <button onClick={handleProfilePicUpload} className={styles.uploadButton}>
                Upload
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'general' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General Info
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'password' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('password')}
          >
            Change Password
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'role' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('role')}
          >
            Change Role
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {/* General Info Tab */}
          {activeTab === 'general' && (
            <form onSubmit={handleProfileUpdate} className={styles.form}>
              <h2>General Information</h2>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  required
                  minLength={2}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Current Role</label>
                <input
                  type="text"
                  value={user?.role || ''}
                  disabled
                  className={styles.disabledInput}
                />
              </div>
              <button type="submit" className={styles.submitButton}>
                Update Profile
              </button>
            </form>
          )}

          {/* Change Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className={styles.form}>
              <h2>Change Password</h2>
              <div className={styles.formGroup}>
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                />
                <small>Password must be at least 6 characters long</small>
              </div>
              <div className={styles.formGroup}>
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className={styles.submitButton}>
                Change Password
              </button>
            </form>
          )}

          {/* Change Role Tab */}
          {activeTab === 'role' && (
            <form onSubmit={handleRoleUpdate} className={styles.form}>
              <h2>Change Role</h2>
              <div className={styles.formGroup}>
                <label>Current Role</label>
                <input
                  type="text"
                  value={user?.role || ''}
                  disabled
                  className={styles.disabledInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Select New Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  required
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={styles.submitButton}>
                Update Role
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
