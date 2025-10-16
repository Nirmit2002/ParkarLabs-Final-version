# Admin Profile Settings Implementation

## Overview
Added profile settings page for Admin and Manager roles with the same functionality as users.

## New Features for Admin/Manager

### Profile Settings Page: `/admin/profile-settings`

All the same features as the user profile settings:

1. **Profile Picture Upload**
   - Upload and change profile picture
   - Preview before uploading
   - Same 5MB limit and file type restrictions
   - Visible in admin dashboard header

2. **Change Password**
   - Secure password change with old password verification
   - Same validation rules (minimum 6 characters)
   - Must match confirmation

3. **Change Role**
   - Admin/Manager can change their own role
   - Updates localStorage automatically
   - Shows all available roles in dropdown

4. **Update Profile Info**
   - Change name and email
   - Email uniqueness validation

## New Files Created

1. **`/frontend/pages/admin/profile-settings.js`**
   - Complete admin profile settings page
   - Same functionality as user profile settings
   - Access restricted to admin and manager roles only
   - Redirects non-admin/manager users to user dashboard

## Modified Files

1. **`/frontend/pages/admin/dashboard.js`**
   - Added "Profile" button in header (next to Logout)
   - Imported `Settings` icon from lucide-react
   - Button navigates to `/admin/profile-settings`

## Access Control

- **URL**: `/admin/profile-settings`
- **Allowed Roles**: Admin, Manager only
- **Redirects**:
  - Non-authenticated users → `/auth/login`
  - Employee role → `/user/dashboard`

## Navigation

### From Admin Dashboard:
1. Click the **"Profile"** button in the top-right header (next to Logout button)
2. Or navigate directly to: `http://localhost:3000/admin/profile-settings`

### Features Available:
- ✅ Upload/Change Profile Picture
- ✅ Change Password (with old password verification)
- ✅ Change Role
- ✅ Update Name and Email

## Backend Endpoints (Shared with Users)

All admin profile operations use the same backend endpoints as regular users:

- `GET /api/profile` - Get profile
- `PUT /api/profile` - Update profile
- `POST /api/profile/picture` - Upload picture
- `PUT /api/profile/password` - Change password
- `PUT /api/profile/role` - Update role

## UI/UX

- **Same Design**: Uses the same `ProfileSettings.module.css` as user profile
- **Tabs**: General Info | Change Password | Change Role
- **Toast Notifications**: Success/error messages for all actions
- **Back Button**: Returns to admin dashboard

## Security

- Role-based access control (admin/manager only)
- Password validation and hashing
- Email uniqueness checks
- File type and size validation for uploads
- All changes logged in audit_logs table

## Testing Checklist

✅ Admin profile settings page created
✅ Profile button added to admin dashboard header
✅ Access control implemented (admin/manager only)
✅ All features working (picture, password, role, info)
✅ Backend endpoints shared with user profile
✅ UI consistent with user profile settings

## Summary

**Both Admin/Manager and regular Users now have:**
- ✅ Profile picture upload
- ✅ Password change functionality
- ✅ Role management
- ✅ Profile info updates
- ✅ Visible profile pictures across all interfaces

**Access:**
- **Users**: `/user/profile-settings`
- **Admin/Manager**: `/admin/profile-settings`

---
**Status**: ✅ Complete
**Date**: 2025-10-14
