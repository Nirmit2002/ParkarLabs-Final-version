#!/bin/bash

# ParkarLabs Platform - Automated Deployment Script
# This script automates the entire deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }
print_header() { echo -e "\n${BLUE}==== $1 ====${NC}\n"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script with sudo"
    exit 1
fi

print_header "ParkarLabs Platform Deployment"
print_info "Starting automated deployment..."

# Get the actual user who ran sudo
ACTUAL_USER=${SUDO_USER:-$USER}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

print_info "Project directory: $PROJECT_DIR"
print_info "User: $ACTUAL_USER"

# Step 1: Update system
print_header "Step 1: Updating System Packages"
apt update -y
apt upgrade -y
print_success "System packages updated"

# Step 2: Install Node.js
print_header "Step 2: Installing Node.js"
if ! command -v node &> /dev/null; then
    print_info "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    print_success "Node.js installed: $(node --version)"
else
    print_success "Node.js already installed: $(node --version)"
fi

# Step 3: Install PostgreSQL
print_header "Step 3: Installing PostgreSQL"
if ! command -v psql &> /dev/null; then
    print_info "Installing PostgreSQL..."
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    print_success "PostgreSQL installed"
else
    print_success "PostgreSQL already installed"
fi

# Step 4: Install PM2
print_header "Step 4: Installing PM2"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

# Step 5: Configure PostgreSQL
print_header "Step 5: Configuring Database"
sudo -u postgres psql <<EOF
-- Create database if not exists
SELECT 'CREATE DATABASE parkarlabs_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'parkarlabs_db')\gexec

-- Ensure postgres user has password
ALTER USER postgres WITH ENCRYPTED PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE parkarlabs_db TO postgres;
EOF

print_success "Database configured"

# Step 6: Import Database (Schema + Data)
print_header "Step 6: Importing Complete Database"
if [ -f "$PROJECT_DIR/db/backup/parkarlabs_backup.sql" ]; then
    print_info "Importing database backup (schema + data)..."

    # Fix file permissions
    chmod 644 "$PROJECT_DIR/db/backup/parkarlabs_backup.sql"

    # Import the complete backup
    sudo -u postgres psql -d parkarlabs_db -f "$PROJECT_DIR/db/backup/parkarlabs_backup.sql" 2>&1 | head -50
    print_success "Database imported successfully"

    # Verify data import
    USER_COUNT=$(sudo -u postgres psql -d parkarlabs_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
    print_success "Users in database: $USER_COUNT"
else
    print_error "Backup file not found at: $PROJECT_DIR/db/backup/parkarlabs_backup.sql"
    exit 1
fi

# Step 8: Configure Backend
print_header "Step 8: Configuring Backend"
cd "$PROJECT_DIR/backend"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_info "Creating backend .env file..."
    JWT_SECRET=$(openssl rand -hex 32)
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
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Application Configuration
ALLOWED_ORIGINS=http://localhost:3000
EOF
    chown $ACTUAL_USER:$ACTUAL_USER .env
    print_success "Backend .env file created"
else
    print_success "Backend .env file already exists"
fi

# Install backend dependencies
print_info "Installing backend dependencies..."
sudo -u $ACTUAL_USER npm install --production
print_success "Backend dependencies installed"

# Step 9: Configure Frontend
print_header "Step 9: Configuring Frontend"
cd "$PROJECT_DIR/frontend"

# Create .env.local file if it doesn't exist
if [ ! -f ".env.local" ]; then
    print_info "Creating frontend .env.local file..."
    SERVER_IP=$(hostname -I | awk '{print $1}')
    cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=ParkarLabs
EOF
    chown $ACTUAL_USER:$ACTUAL_USER .env.local
    print_success "Frontend .env.local file created"
else
    print_success "Frontend .env.local file already exists"
fi

# Install frontend dependencies
print_info "Installing frontend dependencies..."
sudo -u $ACTUAL_USER npm install
print_success "Frontend dependencies installed"

# Build frontend
print_info "Building frontend (this may take a few minutes)..."
sudo -u $ACTUAL_USER npm run build
print_success "Frontend built successfully"

# Step 10: Start Services
print_header "Step 10: Starting Services with PM2"

# Stop existing PM2 processes if any
sudo -u $ACTUAL_USER pm2 delete all 2>/dev/null || true

# Start backend
cd "$PROJECT_DIR/backend"
sudo -u $ACTUAL_USER pm2 start src/server.js --name parkarlabs-backend
print_success "Backend started"

# Start frontend
cd "$PROJECT_DIR/frontend"
sudo -u $ACTUAL_USER pm2 start npm --name parkarlabs-frontend -- start
print_success "Frontend started"

# Save PM2 configuration
sudo -u $ACTUAL_USER pm2 save
sudo -u $ACTUAL_USER pm2 startup systemd -u $ACTUAL_USER --hp /home/$ACTUAL_USER | grep -v "sudo" | bash
print_success "PM2 configured to start on boot"

# Step 11: Configure Firewall
print_header "Step 11: Configuring Firewall"
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    ufw allow 3000/tcp  # Frontend
    ufw allow 5000/tcp  # Backend
    print_success "Firewall configured"
else
    print_warning "UFW not available, skipping firewall configuration"
fi

# Step 12: Verify Deployment
print_header "Step 12: Verifying Deployment"

sleep 5  # Wait for services to start

# Check backend
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    print_success "Backend is running and healthy"
else
    print_warning "Backend health check failed - check logs with: pm2 logs parkarlabs-backend"
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend is running"
else
    print_warning "Frontend check failed - check logs with: pm2 logs parkarlabs-frontend"
fi

# Display PM2 status
sudo -u $ACTUAL_USER pm2 status

# Final summary
print_header "Deployment Complete!"
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
print_success "ParkarLabs Platform is now running!"
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo "  Frontend: http://$SERVER_IP:3000"
echo "  Backend:  http://$SERVER_IP:5000"
echo "  Health:   http://$SERVER_IP:5000/health"
echo ""
echo -e "${BLUE}Default Login Credentials:${NC}"
echo "  Email:    admin@parkar.digital"
echo "  Password: temp123"
echo ""
print_warning "IMPORTANT: Change default passwords immediately!"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  View logs:      pm2 logs"
echo "  View status:    pm2 status"
echo "  Restart all:    pm2 restart all"
echo "  Stop all:       pm2 stop all"
echo ""
print_success "Deployment completed successfully!"
