# Admin Panel & Token Management Setup

## Database Setup

The application uses PostgreSQL database with the following key tables:
- `users` - User accounts with roles and token quotas
- `admin_config` - API configuration settings
- `conversations` - Chat conversations
- `messages` - Individual chat messages
- `sessions` - User session storage

### Initial Setup

1. **Database Schema**: Already configured through Drizzle ORM
2. **Admin User**: Created with admin privileges
3. **Default Configuration**: Basic API settings initialized

### Creating Admin Users

To make a user an admin, update their record in the database:

```sql
UPDATE users SET is_admin = true WHERE email = 'user@example.com';
```

Or use the initialization script:
```bash
node init-db.js
```

## Admin Panel Features

### Accessing Admin Panel

1. Login with an admin account
2. Click user menu in sidebar → "Admin Panel"
3. Or navigate directly to `/admin`

### API Configuration Tab

- **API Provider**: Choose between OpenAI, Anthropic, Qwen, DeepSeek
- **Model Name**: Specify the model (e.g., gpt-4, claude-3, qwen-plus)
- **API Key**: Secure API key storage
- **API Endpoint**: Custom endpoint URL (optional)
- **Default Token Quota**: Default quota for new users
- **Active Status**: Enable/disable the configuration

### User Management Tab

View and manage all users:
- **User Status**: Enable/disable user accounts
- **Token Quotas**: View current usage and set individual quotas
- **Admin Rights**: See which users have admin privileges
- **Email Verification**: Check verification status

#### Token Quota Management

1. Click "Edit Quota" next to any user
2. Set new token limit
3. Changes apply immediately
4. Users are automatically blocked when quota exceeded

## Token Tracking System

### How Token Usage is Calculated

- **Estimation Method**: ~4 characters per token for English text
- **Tracked Events**: Every AI message generation
- **Update Timing**: After each successful AI response
- **Calculation**: `(user_message_length + ai_response_length) / 4`

### Token Usage Updates

When users send messages:
1. User message processed
2. AI generates response
3. Token usage calculated and added to user's total
4. User quota checked before allowing new messages

### Viewing Token Usage

Admin can see for each user:
- **Current Usage**: Total tokens consumed
- **Quota Limit**: Maximum allowed tokens
- **Remaining**: Available tokens left
- **Status**: Active/inactive based on quota

## SMTP Email Configuration

### Environment Variables

Set these variables for email functionality:

```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

### Email Features

- **User Registration**: Welcome emails with verification
- **Password Reset**: Secure reset token emails
- **Admin Notifications**: System alerts and updates

## Database Migration Commands

### Schema Updates
```bash
npm run db:push
```

### Database Initialization
```bash
node init-db.js
```

## Security Features

### Authentication
- Session-based authentication with PostgreSQL storage
- Password hashing with bcrypt
- Secure session cookies

### Authorization
- Role-based access control (admin/user)
- Protected admin routes
- Token-based API access

### Data Protection
- API keys stored securely
- Password reset tokens with expiration
- Session timeout management

## Troubleshooting

### Admin Panel Not Accessible
1. Verify user has `is_admin = true` in database
2. Check user is logged in and session is valid
3. Ensure admin routes are not blocked

### Token Tracking Not Working
1. Verify `updateUserTokenUsage` method is called
2. Check database connection
3. Review token calculation logic in message processing

### Database Connection Issues
1. Verify `DATABASE_URL` environment variable
2. Check PostgreSQL service status
3. Confirm database permissions

## Default Credentials

**Admin Account:**
- Email: `admin@localhost`
- Password: `admin123`

⚠️ **Important**: Change the default admin password immediately after first login!

## API Provider Setup

Configure at least one API provider in the admin panel:

### OpenAI
- Provider: `openai`
- Model: `gpt-4` or `gpt-3.5-turbo`
- API Key: Your OpenAI API key

### Anthropic
- Provider: `anthropic`
- Model: `claude-3-sonnet` or `claude-3-haiku`
- API Key: Your Anthropic API key

### Qwen (Alibaba Cloud)
- Provider: `qwen`
- Model: `qwen-plus` or `qwen-vl-plus` (for vision)
- API Key: Your Qwen API key

### DeepSeek
- Provider: `deepseek`
- Model: `deepseek-chat`
- API Key: Your DeepSeek API key