# Admin User Setup Script

## Overview

This script helps you create the first admin user for the Sales Email Assistant application.

## Usage

### Option 1: Using npm script (Recommended)

```bash
npm run create-admin
```

### Option 2: Direct node command

```bash
node scripts/create-admin.js
```

## What the Script Does

1. **Initializes the database** - Creates the users table if it doesn't exist
2. **Prompts for user information**:
   - Email address
   - Full name
   - Password (with confirmation)
3. **Validates input**:
   - Checks email format
   - Ensures password is at least 6 characters
   - Verifies passwords match
   - Checks if user already exists
4. **Creates the admin user** with:
   - Hashed password (using bcrypt)
   - Admin role
   - Unique user ID

## Requirements

- Node.js installed
- Database configured (SQLite for local, PostgreSQL for Railway)
- Dependencies installed (`npm install`)

## Example

```bash
$ npm run create-admin

=== Admin User Setup ===

This script will create the first admin user for the Sales Email Assistant.

Initializing database...
✓ Database initialized

Enter admin email: admin@example.com
Enter admin name: John Doe
Enter admin password: ********
Confirm password: ********

Hashing password...
Creating admin user...

✅ Admin user created successfully!

User Details:
  Email: admin@example.com
  Name: John Doe
  Role: admin
  ID: 123e4567-e89b-12d3-a456-426614174000

You can now login at /login
```

## Security Notes

- Passwords are hashed using bcrypt (10 rounds)
- The script checks if a user with the email already exists
- Passwords must be at least 6 characters
- The script validates email format

## Troubleshooting

### "User already exists"
- A user with that email already exists in the database
- Use a different email or delete the existing user

### "Database initialization error"
- Make sure your database is properly configured
- For SQLite: Ensure the `data` directory exists and is writable
- For PostgreSQL: Check that `DATABASE_URL` is set correctly

### "Module not found"
- Run `npm install` to install dependencies
- Make sure you're in the project root directory

## Next Steps

After creating the admin user:

1. **Set JWT_SECRET** in your environment variables:
   ```
   JWT_SECRET=your-strong-random-secret-key
   ```

2. **Login** at `/login` with the credentials you just created

3. **Update your profile** to add email signature details (name, title, phone, etc.)

4. **Create additional users** if needed (they can be regular users or admins)

