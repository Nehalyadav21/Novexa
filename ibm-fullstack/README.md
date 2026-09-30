# Novexa - AI-Powered Team Collaboration Platform

An advanced team collaboration platform built with Next.js 15, featuring AI meeting transcription, goal tracking, team management, and secure communication. Powered by IBM Watsonx for intelligent features.

## 🚀 Core Features

### 🎯 AI Meeting Intelligence
- **Live Transcription**: Real-time speech-to-text with IBM Watsonx Speech-to-Text
- **Smart Summaries**: AI-generated meeting summaries with key decisions and action items
- **Auto Task Assignment**: Automatically detects and assigns tasks from meeting discussions
- **Interactive AI Chat**: Ask questions about meeting content and get intelligent responses
- **Multiple Video Options**: Agora and WebRTC support for high-quality video conferencing

### 📊 Smart Goal Tracking  
- **Daily Check-ins**: CAPTCHA-secured progress tracking system
- **Progress Dashboard**: Visual analytics and milestone tracking
- **Goal Management**: Create, track, and monitor team and individual goals
- **Smart Reminders**: AI-driven notifications for goal follow-ups

### 👥 Team Management
- **Secure Authentication**: NextAuth.js with comprehensive user management
- **Team Creation**: Organize members, roles, and projects in unified workspaces
- **Company Profiles**: Detailed company information and member management
- **Role-based Access**: Different permission levels for team members

### 💬 Communication Hub
- **Secure Chat**: Real-time messaging with team channels
- **File Sharing**: Upload and share documents securely
- **Notifications**: Smart notification system for important updates
- **Profile Management**: Comprehensive user profiles with settings

## 🛠️ Technology Stack

### Frontend
- **Next.js 15.4.6** - React framework with App Router and React 19.1.0
- **Framer Motion** - Advanced animations and smooth interactions
- **Tailwind CSS 4** - Modern utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Chakra UI** - Component library for enhanced UI elements

### Backend & Database
- **MongoDB** - Primary database with Mongoose ODM
- **NextAuth.js** - Authentication and session management
- **Socket.IO** - Real-time communication
- **bcryptjs** - Secure password hashing

### AI & Integrations
- **IBM Watsonx** - AI-powered transcription and language processing
- **Cloudinary** - Media storage and optimization
- **Agora RTC** - Professional video conferencing infrastructure
- **WebRTC** - Peer-to-peer media streaming fallback

## 📁 Project Structure

```
ibm-fullstack/
├── src/
│   ├── app/
│   │   ├── agent/              # AI agent interface
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # NextAuth authentication
│   │   │   ├── meetings/       # Meeting management
│   │   │   ├── checkins/       # Daily check-in system
│   │   │   ├── chats/          # Team communication
│   │   │   ├── tasks/          # Task management
│   │   │   ├── teams/          # Team organization
│   │   │   ├── companies/      # Company management
│   │   │   └── watson-stt/     # IBM Watson integration
│   │   ├── chats/              # Chat interface
│   │   ├── dashboard/          # Main dashboard
│   │   ├── login/              # Authentication pages
│   │   ├── signup/             # User registration
│   │   ├── meeting/            # Video conferencing
│   │   ├── meetings/           # Meeting management
│   │   ├── profile/            # User profile
│   │   ├── tasks/              # Task management
│   │   ├── teams/              # Team management
│   │   └── company-info/       # Company profiles
│   ├── components/
│   │   ├── AgoraMeetingHub.js    # Agora video integration
│   │   ├── VideoConference.js    # WebRTC video system
│   │   ├── MeetingRoom.js        # Meeting interface
│   │   ├── CheckInWidget.js      # CAPTCHA check-in system
│   │   ├── TranscriptionPanel.js # AI transcription UI
│   │   ├── ChatSidebar.js        # Real-time chat
│   │   ├── DashboardNavbar.js    # Navigation component
│   │   ├── GoalsPanel.js         # Goal tracking interface
│   │   └── AuthProvider.js       # Authentication context
│   ├── hooks/
│   │   └── useWebRTCMeeting.js   # WebRTC management hook
│   └── lib/
│       ├── mongodb.js            # Database connection
│       ├── models/               # MongoDB schemas
│       └── theme.js              # UI theme configuration
├── server.js                     # Socket.IO signaling server
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

## 🚦 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** database (local or cloud)
- **IBM Watsonx** API credentials
- **Modern web browser** with WebRTC support

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ibm-fullstack
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/novexa
   
   # Authentication
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   
   # IBM Watsonx
   WATSON_API_KEY=your-watson-api-key
   WATSON_SERVICE_URL=your-watson-service-url
   
   # Cloudinary (for file uploads)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   
   # Agora (optional, for enhanced video)
   AGORA_APP_ID=your-agora-app-id
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

### First Time Setup

1. **Create an account**: Visit `/signup` to register
2. **Complete profile**: Add your company information
3. **Create a team**: Invite members and set up workspaces
4. **Start a meeting**: Test video conferencing with AI transcription
5. **Set goals**: Use the check-in system to track progress

## 📋 Platform Usage Guide

### 🏠 Dashboard Overview
The main dashboard provides access to all platform features:
- **Meetings**: Create or join video conferences with AI transcription
- **Tasks**: View assigned tasks and goal progress
- **Teams**: Manage team members and workspaces
- **Chats**: Access real-time team communication
- **Goals**: Track personal and team objectives

### 🎥 Meeting Management

#### Creating a Meeting
1. **Navigate to Meetings**: Click "Meetings" from the dashboard
2. **New Meeting**: Click "Create Meeting" button
3. **Configure Settings**:
   - Set meeting title and description
   - Choose password protection
   - Enable AI transcription
   - Set recording preferences
4. **Start Meeting**: Launch and share the meeting link

#### Joining a Meeting
1. **Direct Link**: Click a shared meeting URL
2. **Meeting ID**: Use the 6-digit meeting code
3. **Guest Access**: Join without account (limited features)
4. **Mobile Support**: Full functionality on mobile devices

#### During Meetings
- **AI Transcription**: Real-time speech-to-text with speaker identification
- **Screen Sharing**: Share entire screen or specific applications
- **Chat**: Text messaging with participants
- **Recording**: Save meetings for later review
- **Participants**: Manage attendees and permissions

### 📊 Smart Features

#### AI-Powered Transcription
- **Real-time Processing**: Live speech-to-text during meetings
- **Speaker Recognition**: Identifies who said what
- **Searchable Content**: Find specific discussions quickly
- **Export Options**: Download transcripts in multiple formats

#### Auto Task Assignment
- **Smart Detection**: AI identifies action items from conversations
- **Member Assignment**: Automatically assigns tasks to mentioned participants
- **Due Date Extraction**: Detects deadlines from natural language
- **Task Tracking**: Integrates with the goal tracking system

#### Meeting Summaries
- **AI Generation**: Automatic summary creation after meetings
- **Key Points**: Highlights important decisions and discussions
- **Action Items**: Lists all tasks and assignments
- **Follow-up**: Suggests next steps and meeting schedules

### ✅ Goal Tracking System

#### Daily Check-ins
1. **CAPTCHA Security**: Solve simple math problems to verify check-ins
2. **Progress Updates**: Log daily achievements and obstacles
3. **Streak Tracking**: Maintain consistency with visual progress
4. **Team Visibility**: Share progress with team members

#### Goal Management
- **Goal Creation**: Set personal and team objectives
- **Milestone Tracking**: Break goals into manageable steps
- **Progress Analytics**: Visual charts and completion rates
- **Achievement Celebrations**: Team recognition for goal completion

### 👥 Team Collaboration

#### Team Organization
- **Workspace Creation**: Set up dedicated team environments
- **Role Management**: Assign different permission levels
- **Member Invitations**: Email invites with onboarding
- **Company Profiles**: Detailed organization information

#### Communication Tools
- **Secure Messaging**: End-to-end encrypted team chat
- **File Sharing**: Upload and share documents safely
- **Notifications**: Smart alerts for important updates
- **Status Updates**: Team member availability and activity

## 🔧 Development & Architecture

### Application Architecture

#### Frontend Architecture
- **Next.js App Router**: Modern file-based routing with React Server Components
- **Component Structure**: Modular, reusable components with clear separation of concerns
- **State Management**: React hooks with context for global state
- **Authentication**: NextAuth.js integration with secure session management

#### Backend API Design
- **RESTful APIs**: Organized by feature with consistent response patterns
- **Real-time Communication**: Socket.IO for live features (chat, transcription)
- **Database Layer**: MongoDB with Mongoose for schema validation
- **Security**: JWT tokens, CAPTCHA verification, input sanitization

#### Key Technologies Integration

**IBM Watsonx Integration**
```javascript
// Speech-to-Text Configuration
const watsonSTT = {
  apikey: process.env.WATSON_API_KEY,
  serviceUrl: process.env.WATSON_SERVICE_URL,
  model: 'en-US_BroadbandModel',
  features: {
    speaker_labels: true,
    smart_formatting: true
  }
};
```

**WebRTC Configuration**
```javascript
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};
```

**Database Schema Examples**
```javascript
// Meeting Schema
{
  meetingId: String,
  title: String,
  hostId: ObjectId,
  participants: [String],
  transcripts: [{
    userId: ObjectId,
    text: String,
    timestamp: Date,
    confidence: Number
  }],
  summary: String,
  status: String, // 'scheduled', 'started', 'ended'
  createdAt: Date
}

// Check-in Schema
{
  userId: ObjectId,
  date: Date,
  captchaAnswer: String,
  progress: String,
  goals: [ObjectId],
  streakCount: Number
}
```

### Customization & Extension

#### Theme Configuration
The platform uses a centralized theme system in `src/lib/theme.js`:
```javascript
export const COLORS = {
  primary: '#6366f1',    // Indigo
  secondary: '#8b5cf6',  // Purple
  accent: '#f59e0b',     // Amber
  tertiary: '#ec4899'    // Pink
};
```

#### Component Customization
- **Styled Components**: Consistent design system with Tailwind CSS
- **Responsive Design**: Mobile-first approach with breakpoint management
- **Animation System**: Framer Motion for smooth interactions
- **Icon Library**: Lucide React with consistent iconography

#### API Extension
```javascript
// Example: Adding a new API endpoint
// src/app/api/custom/route.js
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const data = await request.json();
  // Process request
  return NextResponse.json({ success: true });
}
```

### Performance Optimization

#### Frontend Optimizations
- **Code Splitting**: Automatic route-based splitting with Next.js
- **Image Optimization**: Next.js Image component with Cloudinary integration
- **Lazy Loading**: Dynamic imports for non-critical components
- **Caching Strategy**: Browser caching with appropriate headers

#### Backend Optimizations
- **Database Indexing**: Optimized queries with proper MongoDB indexes
- **Connection Pooling**: Efficient database connection management
- **Compression**: Gzip compression for API responses
- **Rate Limiting**: API throttling to prevent abuse

## 🌐 Production Deployment

### Build & Deployment

#### Environment Configuration
```env
# Production Environment Variables
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/novexa

# Required API Keys
WATSON_API_KEY=your-production-watson-key
CLOUDINARY_CLOUD_NAME=your-production-cloudinary
AGORA_APP_ID=your-production-agora-id
```

#### Build Process
```bash
# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Start production server
npm start
```

#### Deployment Platforms

**Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Docker Deployment**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Security Considerations

#### Authentication Security
- **Session Management**: Secure JWT tokens with rotation
- **Password Security**: bcrypt hashing with salt rounds
- **CAPTCHA Protection**: Math-based verification for check-ins
- **Rate Limiting**: API endpoint protection against abuse

#### Data Protection
- **Encryption**: End-to-end encryption for sensitive data
- **HTTPS Enforcement**: SSL/TLS certificates required
- **Database Security**: MongoDB connection with authentication
- **Input Validation**: Comprehensive sanitization and validation

#### Meeting Security
- **Meeting Passwords**: Required for sensitive meetings
- **Host Controls**: Meeting lock and participant management
- **Recording Permissions**: Consent-based recording system
- **Data Retention**: Configurable transcript and recording retention

### Monitoring & Analytics

#### Application Monitoring
- **Error Tracking**: Comprehensive error logging and alerts
- **Performance Metrics**: Response times and resource usage
- **User Analytics**: Meeting participation and feature usage
- **Health Checks**: Automated system health monitoring

#### Database Monitoring
- **Connection Pool**: MongoDB connection health
- **Query Performance**: Slow query identification
- **Storage Usage**: Database size and growth tracking
- **Backup Strategy**: Automated backups with point-in-time recovery

### Scaling Considerations

#### Horizontal Scaling
- **Load Balancers**: Distribute traffic across multiple instances
- **CDN Integration**: Global content delivery for static assets
- **Database Sharding**: Distribute data across multiple MongoDB instances
- **Microservices**: Split features into independent services

#### Performance Optimization
- **Caching Strategy**: Redis for session and frequently accessed data
- **WebRTC Infrastructure**: Dedicated TURN servers for global connectivity
- **Media Processing**: Separate servers for transcription processing
- **API Optimization**: Query optimization and response caching

## 🤖 IBM Watsonx Integration

### Speech-to-Text Features
- **Real-time Transcription**: Live audio processing during meetings
- **Multi-language Support**: Configure language models for global teams
- **Speaker Identification**: Distinguish between different participants
- **Confidence Scoring**: Quality assessment for transcription accuracy
- **Custom Vocabularies**: Industry-specific terminology recognition

### AI-Powered Meeting Intelligence
- **Summary Generation**: Automatic meeting summary creation
- **Action Item Detection**: AI identifies tasks and assignments
- **Key Decision Extraction**: Highlights important decisions made
- **Sentiment Analysis**: Meeting tone and participant engagement
- **Follow-up Suggestions**: AI recommendations for next steps

### Configuration Examples
```javascript
// Watson STT Configuration
const sttConfig = {
  model: 'en-US_BroadbandModel',
  profanityFilter: false,
  smartFormatting: true,
  speakerLabels: true,
  interimResults: true,
  inactivityTimeout: 30
};

// Custom AI Prompts
const summaryPrompt = `
Analyze this meeting transcript and provide:
- Key decisions made
- Action items with assignees
- Important deadlines mentioned
- Next meeting suggestions
`;
```

## � Troubleshooting & Support

### Common Issues

#### Video/Audio Problems
- **Camera Access**: Check browser permissions in settings
- **Microphone Issues**: Ensure device is not used by other applications
- **Network Connectivity**: Test internet connection and firewall settings
- **Browser Compatibility**: Use Chrome, Firefox, Safari, or Edge

#### Authentication Issues
- **Login Failures**: Verify credentials and account status
- **Session Timeouts**: Check NextAuth configuration and token expiry
- **Password Reset**: Use forgot password feature for account recovery
- **Account Registration**: Ensure email verification is completed

#### Meeting Connection Problems
- **WebRTC Failures**: Check STUN/TURN server configuration
- **Transcription Issues**: Verify IBM Watson API credentials
- **Screen Sharing**: Ensure browser supports getDisplayMedia API
- **Mobile Limitations**: Some features may be limited on mobile browsers

### Debug Configuration
```javascript
// Enable debug logging
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// WebRTC debug
if (DEBUG_MODE) {
  RTCPeerConnection.prototype.originalSetLocalDescription = 
    RTCPeerConnection.prototype.setLocalDescription;
}

// API debug
console.log('API Request:', DEBUG_MODE ? requestData : 'Hidden');
```

### Performance Optimization

#### Database Optimization
```javascript
// MongoDB indexes for better performance
db.meetings.createIndex({ "hostId": 1, "createdAt": -1 });
db.transcripts.createIndex({ "meetingId": 1, "timestamp": 1 });
db.checkins.createIndex({ "userId": 1, "date": -1 });
```

#### Caching Strategy
```javascript
// Next.js caching configuration
export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = 'force-dynamic'; // For real-time features
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/signin` - User login
- `POST /api/auth/signup` - User registration  
- `GET /api/auth/session` - Current session info
- `POST /api/auth/signout` - User logout

### Meeting Management
- `POST /api/meetings` - Create new meeting
- `GET /api/meetings` - List user meetings
- `GET /api/meetings/[id]` - Get meeting details
- `POST /api/meetings/[id]/transcript` - Add transcript
- `POST /api/meetings/[id]/auto-summary` - Generate AI summary

### Team & Communication
- `POST /api/teams` - Create team
- `GET /api/teams/[id]/members` - List team members
- `POST /api/chats` - Send message
- `GET /api/chats/[teamId]` - Get chat history

### Goal Tracking
- `POST /api/checkins` - Submit daily check-in
- `GET /api/checkins/streak` - Get user streak
- `POST /api/tasks` - Create task
- `PUT /api/tasks/[id]` - Update task status

## � License & Contributing

### License
This project is licensed under the MIT License. See the LICENSE file for details.

### Contributing Guidelines

#### Getting Started
1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** from main
4. **Make your changes** with clear commit messages
5. **Test thoroughly** before submitting
6. **Submit a pull request** with detailed description

#### Development Standards
- **Code Style**: Follow ESLint configuration
- **Testing**: Add tests for new features
- **Documentation**: Update README for significant changes
- **Commit Messages**: Use conventional commit format

#### Pull Request Process
1. Update documentation if needed
2. Ensure all tests pass
3. Add screenshots for UI changes
4. Request review from maintainers
5. Address feedback promptly

## 🆘 Support & Community

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check this README and inline comments
- **Community**: Join discussions in GitHub Discussions
- **Email Support**: Contact for enterprise inquiries

### Feature Requests
We welcome feature requests! Please:
1. Check existing issues first
2. Provide clear use case description
3. Include mockups or examples if applicable
4. Consider contributing the feature yourself

### Bug Reports
When reporting bugs, include:
- **Environment**: OS, browser, Node.js version
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Error messages** and console logs
- **Screenshots** if applicable

## 🎯 Roadmap & Future Features

### Upcoming Features
- **Mobile Apps**: Native iOS and Android applications
- **Advanced Analytics**: Detailed meeting and goal analytics
- **Integration Hub**: Slack, Microsoft Teams, and Google Workspace
- **Advanced AI**: Sentiment analysis and meeting coaching
- **White-label Solution**: Customizable branding for enterprises

### Version History
- **v0.1.0**: Initial release with core features
- **Current**: AI transcription, goal tracking, team management
- **Next**: Enhanced mobile experience and integrations

---

## 🚀 Quick Start Summary

1. **Clone** the repository
2. **Install** dependencies with `npm install`
3. **Configure** environment variables in `.env.local`
4. **Start** development server with `npm run dev`
5. **Create** your account and team
6. **Begin** collaborating with AI-powered features

**Ready to transform your team collaboration? Start building with Novexa today!** 🎉

---

*Built with ❤️ using Next.js, React, and IBM Watsonx*
