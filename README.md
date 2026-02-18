# FlowBoard - Modern Project Management System

![Version](https://img.shields.io/badge/version-2.0.0-cyan) ![License](https://img.shields.io/badge/license-MIT-orange)

A modern, beautiful project management system built with React, Node.js, and MySQL. Features real-time collaboration, task tracking, team chat, and video calling.

## 🎨 New Design

Completely rebuilt UI with:
- **Cyan/Teal + Coral/Orange** color scheme
- **Glassmorphism** effects
- **Smooth animations** and transitions
- **Fully responsive** design

## ✨ Features

- 📊 **Project Management** - Create and manage multiple projects
- ✅ **Task Tracking** - Kanban board with drag-and-drop
- 💬 **Real-time Chat** - Project-based team communication
- 📹 **Video Calls** - Built-in video calling with Agora
- 👥 **Team Collaboration** - Invite members and assign tasks
- 🔔 **Notifications** - Stay updated on project activity
- 📱 **Responsive Design** - Works on all devices

## 🚀 Quick Start

### Local Development

```bash
# 1. Clone repository
git clone <your-repo-url>
cd FlowBoard-main

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your settings

# 4. Start backend
cd backend && npm run dev

# 5. Start frontend (new terminal)
cd frontend && npm run dev
```

Visit `http://localhost:5173`

### Docker Deployment

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with production settings

# 2. Build and start
docker compose build
docker compose up -d

# 3. Visit your application
# Frontend: http://localhost
# Backend: http://localhost:5000
```

## 🐳 Docker Setup (EC2)

### Prerequisites

- EC2 instance (Ubuntu 22.04+)
- Docker and Docker Compose installed
- Security group configured (ports 80, 5000, 22)

### Deployment Steps

1. **Update `.env` file**:
```env
SERVER_IP=YOUR_EC2_PUBLIC_IP
BACKEND_PORT=5000
FRONTEND_PORT=80
NODE_ENV=production

DB_HOST=mysql
DB_USER=root
DB_PASSWORD=YOUR_SECURE_PASSWORD
DB_NAME=project_management_db

JWT_SECRET=YOUR_SECRET_KEY

CORS_ORIGIN=http://YOUR_EC2_PUBLIC_IP

VITE_API_URL=http://YOUR_EC2_PUBLIC_IP:5000/api
VITE_BACKEND_URL=http://YOUR_EC2_PUBLIC_IP:5000
VITE_AGORA_APP_ID=YOUR_AGORA_APP_ID
```

2. **Build and deploy**:
```bash
docker compose build --no-cache
docker compose up -d
```

3. **Verify deployment**:
```bash
docker ps  # All containers should be "healthy"
curl http://YOUR_EC2_PUBLIC_IP:5000/api/health  # Should return {"status":"ok"}
```

## 📦 Tech Stack

**Frontend:**
- React 18
- Vite
- React Router
- Socket.IO Client
- Agora RTC SDK
- Lucide Icons

**Backend:**
- Node.js
- Express
- Socket.IO
- MySQL
- JWT Authentication

**DevOps:**
- Docker
- Docker Compose
- Vite Preview Server (no nginx)

## 🗂️ Project Structure

```
FlowBoard-main/
├── backend/
│   ├── server.js           # Main server file
│   ├── routes/             # API routes
│   ├── controllers/        # Business logic
│   ├── middleware/         # Authentication
│   └── config/             # Database config
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── context/        # React context
│   │   └── index.css       # Design system
│   └── Dockerfile          # Frontend Docker config
├── database/
│   └── schema.sql          # Database schema
├── docker-compose.yml      # Docker orchestration
└── .env                    # Environment config
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available options.

**Required:**
- `DB_PASSWORD` - MySQL root password
- `JWT_SECRET` - Secret key for JWT tokens
- `SERVER_IP` - Your server's public IP
- `VITE_API_URL` - Backend API URL
- `VITE_BACKEND_URL` - Backend WebSocket URL

**Optional:**
- `AGORA_APP_ID` - For video calling
- `AGORA_APP_CERTIFICATE` - For Agora token generation

## 📝 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `POST /api/projects/:id/members` - Add member

### Tasks
- `GET /api/tasks/project/:id` - List project tasks
- `POST /api/tasks/project/:id` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Messages
- `GET /api/messages/:projectId` - Get messages
- `POST /api/messages` - Send message

## 🎨 Design System

### Colors

```css
--color-primary-500: #06b6d4;     /* Cyan */
--color-secondary-500: #f97316;   /* Orange */
--color-accent-500: #10b981;      /* Green */
--color-background-primary: #0f172a;  /* Dark */
```

### Components

- Buttons: `.btn-primary`, `.btn-secondary`, `.btn-ghost`
- Cards: `.card`, `.card-glass`
- Inputs: `.input`, `.select`
- Badges: `.badge-primary`, `.badge-success`
- Modals: `.modal-overlay`, `.modal`

## 🧪 Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test

# Build test
docker compose build
```

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- React team for the amazing framework
- Vite for blazing fast builds
- Agora for video calling SDK
- Lucide for beautiful icons

## 📞 Support

For support, email support@flowboard.com or open an issue.

---

Built with ❤️ using React, Node.js, and MySQL
