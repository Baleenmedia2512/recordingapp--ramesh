# MySQL Database Setup

## Prerequisites

Install MySQL Server:
- **Windows**: Download from [mysql.com/downloads](https://dev.mysql.com/downloads/installer/)
- **Using XAMPP**: Already includes MySQL
- **Using WAMP**: Already includes MySQL

## Quick Setup Steps

### 1. Start MySQL Server

**If using XAMPP:**
```
Open XAMPP Control Panel → Start MySQL
```

**If using standalone MySQL:**
```bash
# Windows: MySQL should start automatically or use Services
# Check with: services.msc → MySQL service
```

### 2. Create the Database

**Option A: Using phpMyAdmin (XAMPP/WAMP)**
1. Open http://localhost/phpmyadmin
2. Click "SQL" tab
3. Copy and paste contents from `database/mysql-schema.sql`
4. Click "Go"

**Option B: Using MySQL Command Line**
```bash
# Open Command Prompt
mysql -u root -p

# Then run:
source C:/Users/siva1/OneDrive/Desktop/recordingapp -ramesh/database/mysql-schema.sql
```

**Option C: Using MySQL Workbench**
1. Open MySQL Workbench
2. Connect to localhost
3. File → Run SQL Script → Select `database/mysql-schema.sql`

### 3. Update Environment Variables

Edit `.env.local` with your MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=call_monitor
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### 4. Test Connection

```bash
npm run dev
```

You should see: ✅ MySQL database connected successfully

## Default Test Account

After running the schema, you can login with:
- **Email**: test@callmonitor.com
- **Password**: test123

## Troubleshooting

### "Access denied for user 'root'@'localhost'"
- Update `DB_PASSWORD` in `.env.local` with your MySQL root password
- Or create a new MySQL user with proper privileges

### "Cannot connect to MySQL server"
- Make sure MySQL server is running
- Check port 3306 is not blocked by firewall
- Verify `DB_HOST` and `DB_PORT` in `.env.local`

### "Database 'call_monitor' doesn't exist"
- Run the `mysql-schema.sql` script first
- Or manually create database: `CREATE DATABASE call_monitor;`

## Creating New Users

Users can sign up through the app or manually:

```sql
INSERT INTO users (email, password_hash, full_name) 
VALUES ('user@example.com', '$2a$10$hashedPassword', 'Full Name');
```

Generate password hash using bcrypt online tools or Node.js:
```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your_password', 10);
console.log(hash);
```
