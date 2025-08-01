# Session Expiration Management

This document describes the automatic session expiration handling implemented in the TimeTracker application.

## Overview

The application now includes comprehensive session monitoring that automatically detects when a user's session has expired and redirects them to the login page. This ensures security and prevents users from working with invalid sessions.

## Features

### 1. Automatic Session Monitoring
- **Real-time monitoring**: The system checks session validity every 30 seconds
- **Multiple validation checks**:
  - Session token validity
  - Session expiration time
  - User profile existence in database
- **Automatic cleanup**: Clears cached data and tokens when session expires

### 2. Session Warning System
- **Pre-expiration warning**: Shows a warning 5 minutes before session expires
- **Countdown timer**: Displays remaining time in minutes:seconds format
- **Session extension**: Users can extend their session with one click
- **Dismissible**: Users can dismiss the warning if they prefer

### 3. Automatic Redirect
- **Seamless redirection**: Automatically redirects to login page when session expires
- **State preservation**: Saves current page location for post-login redirect
- **Clean logout**: Clears all cached data and tokens

### 4. API Error Handling
- **Authentication error detection**: Automatically detects JWT and authentication errors
- **Graceful degradation**: Handles API failures due to expired sessions
- **Consistent behavior**: All API calls are wrapped with authentication checks

## Implementation Details

### Components

1. **`useSessionMonitor` Hook** (`src/hooks/useSessionMonitor.ts`)
   - Monitors session status every 30 seconds
   - Listens for auth state changes
   - Triggers session expiration handling

2. **`SessionExpirationModal`** (`src/components/SessionExpirationModal.tsx`)
   - Modal dialog shown when session expires
   - Provides clear messaging and login button

3. **`SessionWarning`** (`src/components/SessionWarning.tsx`)
   - Warning notification 5 minutes before expiry
   - Countdown timer and session extension option

4. **API Utilities** (`src/lib/apiUtils.ts`)
   - `handleApiCall`: Wraps API calls with auth error handling
   - `withAuthCheck`: Pre-validates session before API calls

### Store Updates

The Zustand store (`src/lib/store.ts`) has been enhanced with:
- `sessionExpired`: Boolean flag for session state
- `setSessionExpired`: Function to update session state
- `handleSessionExpiration`: Function to handle session expiration

### Integration Points

1. **App Component** (`src/App.tsx`)
   - Includes `SessionExpirationModal`
   - Uses `useSessionMonitor` in `PrivateRoute`

2. **Layout Component** (`src/components/Layout.tsx`)
   - Includes `SessionWarning` component
   - Uses `useSessionMonitor` for session monitoring

3. **Reports Component** (`src/components/Reports.tsx`)
   - Updated to use `withAuthCheck` for API calls
   - Handles authentication errors gracefully

## User Experience

### Session Expiration Flow

1. **Active Session**: User works normally with full access
2. **Warning Phase** (5 minutes before expiry):
   - Yellow warning appears in bottom-right corner
   - Shows countdown timer
   - User can extend session or dismiss warning
3. **Expiration**: 
   - Modal appears explaining session expiration
   - Automatic redirect to login page
   - Clean state reset

### Session Extension

Users can extend their session by:
- Clicking "Extend Session" in the warning notification
- The system will refresh the session token
- Warning disappears and normal operation resumes

## Security Benefits

1. **Automatic Cleanup**: Removes stale session data
2. **Token Validation**: Ensures tokens are valid and not expired
3. **Profile Verification**: Confirms user still exists in database
4. **Graceful Degradation**: Prevents API errors from broken sessions

## Configuration

### Session Check Interval
- Default: 30 seconds
- Configurable in `useSessionMonitor.ts`

### Warning Timing
- Default: 5 minutes before expiry
- Configurable in `SessionWarning.tsx`

### API Error Codes
- `PGRST116`: PostgREST authentication error
- JWT-related errors: Token validation failures

## Testing

To test session expiration:

1. **Manual Testing**:
   - Log in to the application
   - Wait for session warning (if close to expiry)
   - Test session extension functionality
   - Simulate session expiry by clearing tokens

2. **Development Testing**:
   - Use browser dev tools to clear localStorage
   - Modify session expiry time for testing
   - Test API calls with invalid tokens

## Troubleshooting

### Common Issues

1. **Session not expiring**: Check if session monitoring is active
2. **Warning not showing**: Verify session expiry time calculation
3. **API errors**: Ensure API utilities are being used correctly
4. **Redirect loops**: Check login page authentication logic

### Debug Information

Enable console logging to see:
- Session check intervals
- Expiration detection
- API error handling
- Redirect triggers

## Future Enhancements

1. **Configurable timeouts**: Allow customization of warning and check intervals
2. **Session activity tracking**: Extend sessions based on user activity
3. **Multiple tab handling**: Coordinate session state across browser tabs
4. **Offline support**: Handle session expiration when offline 