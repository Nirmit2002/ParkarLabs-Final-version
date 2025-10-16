# ParkarLabs Platform - Deployment Guide

This guide will help you deploy the ParkarLabs platform to a new server with all data and configurations.

## 📋 Prerequisites

- Ubuntu/Debian Linux server (20.04 or later recommended)
- Sudo access
- Git installed
- Internet connection

## 🚀 Quick Deployment (One-Command Setup)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/Parkarlabs.git
cd Parkarlabs

# Run the automated setup script
chmod +x scripts/deploy-setup.sh
sudo ./scripts/deploy-setup.sh
```

The setup script will automatically:
1. Install Node.js, PostgreSQL, and all dependencies
2. Create and configure the database
3. Import all existing data
4. Set up environment variables
5. Build the frontend
6. Start the application with PM2

## 📝 Manual Deployment (Step-by-Step)

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/Parkarlabs.git
cd Parkarlabs
```

### Step 2: Install System Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Verify installations
node --version    # Should be v18.x or later
npm --version
psql --version
```

### Step 3: Configure PostgreSQL

```bash
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE parkarlabs_db;
CREATE USER postgres WITH ENCRYPTED PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE parkarlabs_db TO postgres;
\q
EOF
```

### Step 4: Set Up Database Schema and Data

```bash
# Create database schema
sudo -u postgres psql -d parkarlabs_db -f db/schema/schema.sql

# Import existing data (includes all users, roles, and configurations)
sudo -u postgres psql -d parkarlabs_db -f db/backup/parkarlabs_backup.sql

# Verify database setup
sudo -u postgres psql -d parkarlabs_db -c "SELECT COUNT(*) FROM users;"
```

### Step 5: Configure Environment Variables

#### Backend Configuration

```bash
cd backend

# Create .env file
cat > .env <<EOF
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=parkarlabs_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=parkarlabs_jwt_secret_key_2024_production_$(openssl rand -hex 16)
JWT_EXPIRES_IN=24h

# Application Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://YOUR_DOMAIN.com
EOF

# Install dependencies
npm install --production

# Verify backend setup
npm test || node src/server.js &
sleep 3
curl http://localhost:5000/health
pkill -f "node src/server.js"
```

#### Frontend Configuration

```bash
cd ../frontend

# Create .env.local file
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:5000
NEXT_PUBLIC_APP_NAME=ParkarLabs
EOF

# Install dependencies and build
npm install
npm run build
```

### Step 6: Start the Application

```bash
# Start backend with PM2
cd ../backend
pm2 start src/server.js --name parkarlabs-backend

# Start frontend with PM2
cd ../frontend
pm2 start npm --name parkarlabs-frontend -- start

# Save PM2 configuration
pm2 save
pm2 startup

# Check status
pm2 status
pm2 logs
```

### Step 7: Configure Firewall

```bash
# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Frontend (if not using reverse proxy)
sudo ufw allow 5000/tcp  # Backend API (if not using reverse proxy)
sudo ufw enable
```

## 🔧 Configuration Details

### Database Information

- **Database Name:** parkarlabs_db
- **Default User:** postgres
- **Default Password:** postgres (⚠️ Change this in production!)
- **Port:** 5432

### Application Ports

- **Backend API:** 5000
- **Frontend:** 3000

### Default User Accounts

The database includes the following users:

- **Admin Account:**
  - Email: admin@parkar.digital
  - Password: temp123

- **Employee Account:**
  - Email: jigar@parkar.digital
  - Password: temp123

⚠️ **Important:** Change all default passwords immediately after deployment!

## 🔐 Security Recommendations

### 1. Change Default Passwords

```bash
# Connect to database
sudo -u postgres psql -d parkarlabs_db

# Change postgres database password
ALTER USER postgres WITH PASSWORD 'your_secure_password_here';
\q
```

Update the password in `backend/.env`:
```
DB_PASSWORD=your_secure_password_here
```

### 2. Update JWT Secret

Generate a new JWT secret:
```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" >> backend/.env
```

### 3. Configure HTTPS

Install and configure Nginx with Let's Encrypt SSL:

```bash
# Install Nginx
sudo apt install -y nginx

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Configure Nginx as reverse proxy
sudo nano /etc/nginx/sites-available/parkarlabs
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/parkarlabs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔄 Backup and Maintenance

### Create Database Backup

```bash
cd /path/to/Parkarlabs
node scripts/export-database.js
```

This creates a backup at `db/backup/parkarlabs_backup.sql`

### Restore Database

```bash
# Stop the application
pm2 stop all

# Restore from backup
node scripts/import-database.js

# Start the application
pm2 start all
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Update backend
cd backend
npm install
pm2 restart parkarlabs-backend

# Update frontend
cd ../frontend
npm install
npm run build
pm2 restart parkarlabs-frontend
```

## 📊 Monitoring

### View Application Logs

```bash
# View all logs
pm2 logs

# View specific application logs
pm2 logs parkarlabs-backend
pm2 logs parkarlabs-frontend

# Monitor resource usage
pm2 monit
```

### Database Monitoring

```bash
# Check database size
sudo -u postgres psql -d parkarlabs_db -c "SELECT pg_size_pretty(pg_database_size('parkarlabs_db'));"

# Check active connections
sudo -u postgres psql -d parkarlabs_db -c "SELECT count(*) FROM pg_stat_activity;"

# View recent audit logs
sudo -u postgres psql -d parkarlabs_db -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
```

## 🐛 Troubleshooting

### Backend Not Starting

```bash
# Check logs
pm2 logs parkarlabs-backend

# Check if port is in use
sudo lsof -i :5000

# Restart backend
pm2 restart parkarlabs-backend
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test database connection
sudo -u postgres psql -d parkarlabs_db -c "SELECT 1;"
```

### Frontend Not Loading

```bash
# Check logs
pm2 logs parkarlabs-frontend

# Rebuild frontend
cd frontend
npm run build
pm2 restart parkarlabs-frontend
```

### Port Already in Use

```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill the process
sudo kill -9 PID

# Or change the port in backend/.env
```

## 📞 Support

For issues or questions:
- Check logs: `pm2 logs`
- Review this deployment guide
- Check application health: `curl http://localhost:5000/health`

## 📝 Post-Deployment Checklist

- [ ] Database is running and accessible
- [ ] Backend API responds to health check
- [ ] Frontend loads successfully
- [ ] Can login with admin credentials
- [ ] Default passwords have been changed
- [ ] JWT secret has been updated
- [ ] Firewall is configured
- [ ] SSL certificate is installed (production)
- [ ] PM2 is configured to start on boot
- [ ] Backups are scheduled
- [ ] Monitoring is set up

## 🔗 Important URLs

- Frontend: http://YOUR_SERVER_IP:3000
- Backend API: http://YOUR_SERVER_IP:5000
- API Health Check: http://YOUR_SERVER_IP:5000/health

---

**Last Updated:** $(date +%Y-%m-%d)
**Version:** 1.0.0
