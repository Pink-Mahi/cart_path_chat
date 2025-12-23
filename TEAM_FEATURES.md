# Team Features Setup Guide

## Overview

Phase 1 team features have been implemented, including:
- ✅ User authentication system
- ✅ Multi-admin notification system
- ✅ Per-user notification preferences and scheduling
- ✅ Conversation assignment (foundation)
- ✅ Login page UI

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install the new dependencies:
- `bcrypt` - Password hashing
- `express-session` - Session management

### 2. Run Database Migration

```bash
node scripts/migrate.js
```

This creates the new database tables:
- `users` - Team member accounts
- `admin_presence` - Real-time presence tracking
- Updates `conversations` table with assignment fields

### 3. Create Your First Admin User

```bash
node scripts/createAdminUser.js
```

Follow the prompts to create an admin account with:
- Name
- Email
- Password
- Phone number (optional)

### 4. Update Environment Variables

Add to your `.env` file:

```env
SESSION_SECRET=your-random-secret-key-change-in-production
```

Generate a secure random string for production!

### 5. Start the Server

```bash
npm start
```

### 6. Login

Navigate to `/login.html` and login with your admin credentials.

## Features Implemented

### User Authentication
- Login/logout system
- Session-based authentication
- Password hashing with bcrypt
- Role-based access (Admin/Agent)

### Multi-Admin Notifications
- Notifications sent to ALL active admins (not just one phone)
- Respects individual notification preferences
- Checks work schedules and mute status
- SMS and voice call support

### Per-User Notification Control
Each admin can configure:
- **Phone number** for SMS/calls
- **Notification methods** (SMS, calls, in-app)
- **Work schedule** (Mon-Sun with hours)
- **Lunch break** (auto-mute during lunch)
- **Quick mute** options:
  - Out to lunch (1 hour)
  - Off work today (until tomorrow 9am)
  - Custom duration

### User Roles

**Admin Role:**
- Full access to all features
- Can manage users
- Can view all conversations
- Can change settings

**Agent Role (for future call center):**
- Can only see assigned conversations
- Cannot manage users or settings
- Limited access

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `GET /api/auth/status` - Check auth status

### User Management
- `GET /api/users` - List all users (admin only)
- `POST /api/users` - Create user (admin only)
- `GET /api/users/:id` - Get user details
- `PATCH /api/users/:id` - Update user
- `PATCH /api/users/:id/password` - Change password
- `PATCH /api/users/:id/notifications` - Update notification settings
- `POST /api/users/:id/mute` - Quick mute actions
- `DELETE /api/users/:id` - Deactivate user (admin only)

### Conversations
- `POST /api/conversations/:id/assign` - Assign conversation to user

## How Notifications Work Now

### Before (Single Admin):
```
New chat → SMS to one phone number
```

### After (Multi-Admin):
```
New chat → Check all admins:
  - Is admin active?
  - Is admin muted?
  - Is admin within work hours?
  - Is lunch break active?
  
→ Send SMS to all available admins
```

### Example Scenario:
```
Team of 4 admins:
- Sarah: Available (gets SMS)
- Mike: Muted for lunch (no SMS)
- John: Off today (no SMS)
- Manager: Available (gets SMS)

Result: Sarah and Manager receive SMS
```

## Notification Preferences

Access via: `PATCH /api/users/:id/notifications`

```json
{
  "notify_sms": true,
  "notify_call": false,
  "is_muted": false,
  "muted_until": null,
  "work_schedule": {
    "monday": {"start": "09:00", "end": "17:00", "enabled": true},
    "tuesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "wednesday": {"enabled": false},
    "thursday": {"start": "09:00", "end": "17:00", "enabled": true},
    "friday": {"start": "09:00", "end": "15:00", "enabled": true},
    "saturday": {"enabled": false},
    "sunday": {"enabled": false},
    "lunch_break": {"start": "12:00", "end": "13:00", "enabled": true}
  }
}
```

## Quick Mute Actions

```bash
# Mute for lunch (1 hour)
POST /api/users/:id/mute
{"duration": "lunch"}

# Mute for the day
POST /api/users/:id/mute
{"duration": "day"}

# Mute for custom minutes
POST /api/users/:id/mute
{"duration": 120}

# Unmute
POST /api/users/:id/mute
{"duration": null}
```

## Migration from Old System

The old `admin_settings` table still exists for backward compatibility. The new system:
- Uses per-user phone numbers instead of `on_duty_phone`
- Checks individual user preferences instead of global settings
- Maintains the same notification triggers

## Next Steps (Not Yet Implemented)

Phase 2 features to be built:
- Real-time presence indicators (who's viewing/typing)
- Conversation assignment UI
- Team status dashboard
- Internal notes and tags
- Performance metrics

## Troubleshooting

### Can't login?
- Ensure you ran `node scripts/createAdminUser.js`
- Check that SESSION_SECRET is set in .env
- Verify database migration completed

### Not receiving notifications?
- Check user's phone_number is set
- Verify notify_sms is true
- Check work_schedule allows current time
- Ensure not muted (is_muted = false)

### Database errors?
- Run migration: `node scripts/migrate.js`
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running

## Security Notes

- Passwords are hashed with bcrypt (10 rounds)
- Sessions use httpOnly cookies
- Set SESSION_SECRET to a strong random string in production
- Set cookie.secure = true in production (HTTPS)
