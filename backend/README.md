# ErMate Backend

Emergency Medicine Knowledge Base and API Server

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation
```bash
npm install
```

### Environment Configuration

#### For Local Developers
1. Copy `env.example` to `.env`
2. Fill in your database credentials and API keys
3. Start the server: `npm run dev`

#### For Cursor Users
1. Use the provided `env.local` file (already configured with dev values)
2. The system will automatically load from `env.local` when `.env` is blocked
3. Start the server: `npm run dev`

#### For Hosted Database (Neon, Supabase, etc.)
1. Set `DATABASE_URL` with your connection string
2. Include `?sslmode=require` for SSL connections
3. Example: `postgresql://user:pass@host:port/db?sslmode=require`

#### For Production
Set environment variables in your deployment system (Docker, Kubernetes, etc.)

### Required Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JWT_SECRET` | ✅ | JWT signing secret | `32_char_min_secret` |
| `PORT` | ❌ | Server port (default: 3000) | `3000` |
| `NODE_ENV` | ❌ | Environment (default: development) | `development` |
| `CORS_ORIGIN` | ❌ | Frontend origin | `http://localhost:19006` |

### Database Configuration (Choose One)

#### Option 1: Hosted Database (Recommended for Production)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | Full connection string | `postgresql://user:pass@host:port/db?sslmode=require` |

#### Option 2: Local Database (Development)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DB_HOST` | ✅ | Database host | `localhost` |
| `DB_PORT` | ✅ | Database port | `5432` |
| `DB_NAME` | ✅ | Database name | `ermate_db` |
| `DB_USER` | ✅ | Database user | `ermate_user` |
| `DB_PASSWORD` | ✅ | Database password | `your_password` |

### Voice Services (Optional)
- `VOICE_GOOGLE_PROJECT_ID` - Google Cloud project ID
- `VOICE_OPENAI_API_KEY` - OpenAI API key
- `VOICE_ENABLE_GOOGLE` - Enable Google STT/TTS
- `VOICE_ENABLE_WHISPER` - Enable OpenAI Whisper

## 🔧 Development

### Starting the Server

**⚠️ IMPORTANT: Use separate terminal for backend**

```bash
# Start development server
npm run dev
```

**Windows/PowerShell Users:**
- **❌ Don't use**: `cd backend && npm run dev`
- **✅ Use instead**: 
  ```cmd
  cd backend
  npm run dev
  ```
- **Or use batch file**: Double-click `start-backend.bat` from root directory

### Other Commands

```bash
# Run tests
npm test

# Build for production
npm run build

# Setup project (creates directories)
npm run setup:full
```

## 📚 API Documentation

Once running, visit: `http://localhost:3000/api/docs`

## 🏥 Health Check

`http://localhost:3000/health`

## 🔐 Security

- JWT authentication for protected routes
- Rate limiting on API endpoints
- CORS configuration for frontend
- Emergency mode tokens for voice access

## 📁 Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
├── rule-engine/     # Medical rule processing
└── sources/         # External data sources
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:watch
```

## 🚨 Troubleshooting

### Server Won't Start
1. Check environment variables are set correctly
2. Ensure PostgreSQL is running
3. Verify database credentials
4. Check console for environment validation errors

### Database Connection Issues
1. Verify PostgreSQL service is running
2. Check database credentials in environment
3. Ensure database exists: `createdb ermate_db`
4. Check firewall/network settings

### Environment Loading Issues
- **Local devs**: Use `.env` file
- **Cursor users**: Use `env.local` file
- **Production**: Set system environment variables

## 📄 License

MIT License - see LICENSE file for details
