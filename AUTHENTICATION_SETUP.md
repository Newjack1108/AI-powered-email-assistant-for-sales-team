# Authentication System Setup

## Overview

The authentication system has been added with the following features:
- User login/logout
- Admin role support
- User profile with email signature details
- Protected routes
- Email signature integration

## Database

A `users` table has been added with the following fields:
- `id` - Unique user ID
- `email` - User email (unique)
- `password_hash` - Hashed password
- `name` - User's full name
- `role` - 'admin' or 'user'
- `signature_name` - Name for email signature
- `signature_title` - Job title for signature
- `signature_phone` - Phone number for signature
- `signature_email` - Email for signature
- `signature_company` - Company name for signature
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

## API Routes

### `/api/auth/login` (POST)
- Login with email and password
- Returns user data and sets auth cookie

### `/api/auth/logout` (POST)
- Logs out the current user
- Clears auth cookie

### `/api/auth/me` (GET)
- Gets current logged-in user
- Requires authentication

### `/api/auth/register` (POST)
- Register a new user
- Requires email, password, name
- Optional role (defaults to 'user')

## Environment Variables

Add to your `.env.local` or Railway variables:

```
JWT_SECRET=your-secret-key-change-this-in-production
```

**Important:** Change the JWT_SECRET to a strong random string in production!

## Creating the First Admin User

You can create the first admin user by calling the register API:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-secure-password",
    "name": "Admin User",
    "role": "admin"
  }'
```

Or create a simple script to do this (see next steps).

## Next Steps

1. **Set JWT_SECRET** in environment variables
2. **Create first admin user** (see above)
3. **Login** at `/login`
4. **Update user profile** to add signature details
5. **Test email generation** - signature will be automatically added

## Features

- ✅ User authentication with JWT tokens
- ✅ Password hashing with bcrypt
- ✅ Admin role support
- ✅ Email signature storage
- ✅ Protected API routes
- ✅ Login/logout functionality

## Remaining Tasks

- [ ] Add route protection middleware
- [ ] Create user profile page
- [ ] Integrate signature into email generation
- [ ] Update header with user info and logout

