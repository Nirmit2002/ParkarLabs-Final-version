# ParkarLabs Platform

A comprehensive cloud labs and learning management system with container provisioning, user management, and course assignments.

## 🌟 Features

- **User Management**: Complete role-based access control (Admin, Manager, Employee)
- **Authentication**: Secure login with JWT tokens and @parkar.digital domain restriction
- **Container Management**: Provision and manage Docker containers for cloud labs
- **Course Management**: Create and assign courses to users
- **Audit Logging**: Complete activity tracking and audit trails
- **Dashboard**: Real-time analytics and monitoring
- **Responsive Design**: Modern UI built with Next.js and Tailwind CSS

## 🏗️ Architecture

### Backend
- **Framework**: Node.js with Express
- **Database**: PostgreSQL
- **Authentication**: JWT with bcrypt password hashing
- **API**: RESTful API architecture

### Frontend
- **Framework**: Next.js 13+ (React)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks

## 📋 Prerequisites

- Node.js 18.x or later
- PostgreSQL 12 or later
- npm or yarn
- Git

## 🚀 Quick Start

### Option 1: Automated Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/Parkarlabs.git
cd Parkarlabs

# Run automated setup
chmod +x scripts/deploy-setup.sh
sudo ./scripts/deploy-setup.sh
```

The automated script will:
- Install all dependencies (Node.js, PostgreSQL, PM2)
- Set up the database with sample data
- Configure environment variables
- Build and start the application

### Option 2: Manual Setup

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed manual installation instructions.

## 🔑 Default Credentials

After deployment, you can login with:

- **Admin Account:**
  - Email: `admin@parkar.digital`
  - Password: `temp123`

⚠️ **Important:** Change these credentials immediately after first login!

## 📁 Project Structure

```
Parkarlabs/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Authentication & validation
│   │   ├── routes/         # API routes
│   │   └── server.js       # Entry point
│   ├── config/             # Configuration files
│   └── package.json
├── frontend/               # Next.js frontend
│   ├── pages/             # Application pages
│   │   ├── admin/         # Admin dashboard
│   │   ├── user/          # User dashboard
│   │   └── auth/          # Authentication pages
│   ├── public/            # Static assets
│   ├── styles/            # Global styles
│   └── package.json
├── db/                     # Database files
│   ├── schema/            # Database schema
│   └── backup/            # Database backups
├── scripts/               # Deployment & utility scripts
│   ├── deploy-setup.sh    # Automated deployment
│   ├── export-database.js # Database export
│   └── import-database.js # Database import
├── DEPLOYMENT.md          # Detailed deployment guide
└── README.md              # This file
```

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=parkarlabs_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=ParkarLabs
```

## 🗄️ Database

The application uses PostgreSQL with the following main tables:

- `users` - User accounts and profiles
- `roles` - User roles and permissions
- `containers` - Container instances
- `courses` - Course catalog
- `assignments` - Course assignments
- `audit_logs` - Activity tracking
- `local_auth` - Password hashes
- `sessions` - User sessions

### Database Backup

```bash
# Export database
node scripts/export-database.js

# Import database
node scripts/import-database.js
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token

### Users (Admin)
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Containers
- `GET /api/containers` - List containers
- `POST /api/containers` - Create container
- `GET /api/containers/:id` - Get container details
- `PUT /api/containers/:id` - Update container
- `DELETE /api/containers/:id` - Delete container

### Courses
- `GET /api/courses` - List courses
- `POST /api/courses` - Create course
- `GET /api/courses/:id` - Get course details

## 🛠️ Development

### Running Locally

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🐳 Docker Support (Coming Soon)

Docker Compose configuration for containerized deployment.

## 📊 Monitoring

The application uses PM2 for process management:

```bash
# View logs
pm2 logs

# View status
pm2 status

# Restart services
pm2 restart all

# Monitor resources
pm2 monit
```

## 🔒 Security Features

- JWT-based authentication
- bcrypt password hashing (12 rounds)
- Role-based access control (RBAC)
- Email domain restriction (@parkar.digital only)
- SQL injection protection
- CORS configuration
- Audit logging for all actions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 📞 Support

For issues and questions:
- Check the [DEPLOYMENT.md](DEPLOYMENT.md) guide
- Review application logs: `pm2 logs`
- Check database status: `sudo systemctl status postgresql`

## 🚀 Deployment Checklist

- [ ] Clone repository
- [ ] Run deployment script
- [ ] Verify services are running
- [ ] Change default passwords
- [ ] Update JWT secret
- [ ] Configure firewall
- [ ] Set up SSL/HTTPS (production)
- [ ] Configure domain name
- [ ] Set up backups
- [ ] Configure monitoring

## 📈 Roadmap

- [ ] Docker containerization
- [ ] Azure AD integration
- [ ] Advanced analytics dashboard
- [ ] Real-time notifications
- [ ] Multi-factor authentication
- [ ] API rate limiting
- [ ] Automated testing suite

---

**Built with ❤️ by ParkarLabs Team**
