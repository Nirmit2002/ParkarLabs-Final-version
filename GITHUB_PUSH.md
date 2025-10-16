# GitHub Deployment Guide

This guide will help you push the ParkarLabs platform to GitHub and deploy it on a new server.

## 📤 Step 1: Push to GitHub

### Create a New GitHub Repository

1. Go to https://github.com and create a new repository
2. Repository name: `Parkarlabs` (or your preferred name)
3. Make it **Private** (recommended for production apps)
4. Do NOT initialize with README (we already have one)

### Push Your Code

```bash
cd /root/Parkarlabs

# Add all files
git add .

# Commit changes
git commit -m "Initial commit - ParkarLabs Platform with complete setup

- Added database backup with all users and data
- Added automated deployment script
- Added comprehensive documentation
- Configured email domain restriction (@parkar.digital)
- Added user management features
- Included all frontend and backend code"

# Add your GitHub repository as remote
git remote remove origin  # Remove old origin if exists
git remote add origin https://github.com/YOUR_USERNAME/Parkarlabs.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Verify Upload

After pushing, verify on GitHub that these files are present:
- ✅ `README.md` - Main documentation
- ✅ `DEPLOYMENT.md` - Deployment guide
- ✅ `db/backup/parkarlabs_backup.sql` - Database backup
- ✅ `scripts/deploy-setup.sh` - Automated deployment script
- ✅ Backend and Frontend code
- ✅ `.gitignore` - Excludes node_modules and sensitive files

## 🖥️ Step 2: Deploy on New Server

### Prerequisites

Your new server should have:
- Ubuntu 20.04 or later
- At least 2GB RAM
- Root or sudo access
- Internet connection

### One-Command Deployment

SSH into your new server and run:

```bash
# Install git if not present
sudo apt update && sudo apt install -y git

# Clone the repository
git clone https://github.com/YOUR_USERNAME/Parkarlabs.git
cd Parkarlabs

# Run automated deployment
chmod +x scripts/deploy-setup.sh
sudo ./scripts/deploy-setup.sh
```

That's it! The script will:
1. ✅ Install Node.js, PostgreSQL, and PM2
2. ✅ Set up the database
3. ✅ Import all your data (users, roles, etc.)
4. ✅ Install all dependencies
5. ✅ Build the frontend
6. ✅ Start both services with PM2
7. ✅ Configure firewall
8. ✅ Set up auto-start on boot

### Expected Output

The deployment should complete in 5-10 minutes and show:

```
==== Deployment Complete! ====

✓ ParkarLabs Platform is now running!

Access URLs:
  Frontend: http://YOUR_SERVER_IP:3000
  Backend:  http://YOUR_SERVER_IP:5000
  Health:   http://YOUR_SERVER_IP:5000/health

Default Login Credentials:
  Email:    admin@parkar.digital
  Password: temp123

⚠ IMPORTANT: Change default passwords immediately!

Useful Commands:
  View logs:      pm2 logs
  View status:    pm2 status
  Restart all:    pm2 restart all
  Stop all:       pm2 stop all
```

## 🔐 Step 3: Post-Deployment Security

After deployment, immediately:

1. **Change admin password**
   - Login at: http://YOUR_SERVER_IP:3000
   - Email: admin@parkar.digital
   - Password: temp123
   - Go to profile settings and change password

2. **Update database password**
   ```bash
   sudo -u postgres psql
   ALTER USER postgres WITH PASSWORD 'your_strong_password';
   \q
   ```

   Update `backend/.env`:
   ```bash
   nano backend/.env
   # Change DB_PASSWORD=postgres to your new password
   pm2 restart parkarlabs-backend
   ```

3. **Set up HTTPS** (for production)
   - Get a domain name
   - Install Nginx and Certbot
   - Configure SSL certificate
   - See DEPLOYMENT.md for detailed instructions

## 📊 Step 4: Verify Deployment

### Check Services

```bash
# View status
pm2 status

# View logs
pm2 logs

# Check backend health
curl http://localhost:5000/health

# Check frontend
curl http://localhost:3000
```

### Check Database

```bash
# Connect to database
sudo -u postgres psql -d parkarlabs_db

# Verify users
SELECT id, name, email, status FROM users;

# Exit
\q
```

### Test Login

1. Open browser: `http://YOUR_SERVER_IP:3000`
2. Click "Login"
3. Use credentials:
   - Email: `admin@parkar.digital`
   - Password: `temp123`
4. You should see the admin dashboard

## 🔄 Updating the Application

To update your application after making changes:

```bash
# On your local machine
cd /root/Parkarlabs
git add .
git commit -m "Your update message"
git push origin main

# On your server
cd Parkarlabs
git pull origin main

# Rebuild and restart
cd frontend
npm run build
pm2 restart parkarlabs-frontend

cd ../backend
pm2 restart parkarlabs-backend
```

## 💾 Creating New Backups

To create a fresh backup of your database:

```bash
cd Parkarlabs
node scripts/export-database.js
```

This creates/updates `db/backup/parkarlabs_backup.sql`

Commit and push the new backup:
```bash
git add db/backup/parkarlabs_backup.sql
git commit -m "Update database backup"
git push origin main
```

## 🐛 Troubleshooting

### Problem: Can't access the application

```bash
# Check if services are running
pm2 status

# Check logs for errors
pm2 logs

# Restart services
pm2 restart all
```

### Problem: Database connection failed

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Verify database exists
sudo -u postgres psql -l | grep parkarlabs
```

### Problem: Port already in use

```bash
# Find what's using the port
sudo lsof -i :5000
sudo lsof -i :3000

# Kill the process or change the port in .env files
```

### Problem: Permission denied

```bash
# Fix ownership
sudo chown -R $USER:$USER /path/to/Parkarlabs

# Fix script permissions
chmod +x scripts/*.sh
```

## 📞 Getting Help

1. Check logs: `pm2 logs`
2. Review [DEPLOYMENT.md](DEPLOYMENT.md)
3. Check service status: `pm2 status`
4. Verify database: `sudo -u postgres psql -d parkarlabs_db`

## ✅ Deployment Checklist

Before pushing to GitHub:
- [x] Database backup created
- [x] Deployment scripts ready
- [x] Documentation complete
- [x] .gitignore configured
- [x] Environment examples provided

After deployment on new server:
- [ ] Services running (pm2 status shows both apps)
- [ ] Can access frontend (http://SERVER_IP:3000)
- [ ] Can access backend (http://SERVER_IP:5000)
- [ ] Can login with admin credentials
- [ ] Database has users and data
- [ ] Changed default passwords
- [ ] Configured firewall
- [ ] Set up HTTPS (production)
- [ ] Tested basic functionality

## 🎉 Success!

Your ParkarLabs platform should now be:
- ✅ Version controlled on GitHub
- ✅ Easily deployable to any new server
- ✅ Running with all data and users intact
- ✅ Secure and production-ready

---

**Last Updated:** $(date +%Y-%m-%d)
