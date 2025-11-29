# Database Setup Guide

This application uses PostgreSQL with Prisma ORM for managing coach data.

## Prerequisites

- PostgreSQL installed and running (version 12 or higher)
- Node.js 18.15.0 or higher

## Installation Steps

### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### 2. Create Database

Connect to PostgreSQL and create the database:

```bash
# Connect as postgres user
psql -U postgres

# In psql prompt, create database
CREATE DATABASE scheduler_db;

# Create user (optional, if not using default postgres user)
CREATE USER scheduler_user WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE scheduler_db TO scheduler_user;

# Exit psql
\q
```

### 3. Configure Environment Variables

Update the `.env` file in the project root with your database credentials:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/scheduler_db?schema=public"
```

Replace `postgres:postgres` with `username:password` if you created a custom user.

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Push Schema to Database

This will create the tables in your database:

```bash
npm run db:push
```

Or use Prisma directly:

```bash
npx prisma db push
```

### 6. Seed Initial Data

Populate the database with initial coaches:

```bash
npm run db:seed
```

Or use Prisma directly:

```bash
npx prisma db seed
```

This will create 4 initial coaches:
- 教练A (Coach A) - Blue
- 教练B (Coach B) - Emerald
- 教练C (Coach C) - Purple
- 教练D (Coach D) - Amber

## Verification

### Check Database Connection

```bash
npx prisma studio
```

This will open Prisma Studio at `http://localhost:5555` where you can view and manage your data.

### Verify in PostgreSQL

```bash
psql -U postgres -d scheduler_db

# List tables
\dt

# View coaches
SELECT * FROM coaches;

# Exit
\q
```

## API Endpoints

Once the database is set up, the following API endpoints are available:

### Coaches

- `GET /api/coaches` - Get all coaches
- `POST /api/coaches` - Create a new coach
  ```json
  {
    "name": "教练E",
    "color": "bg-red-500",
    "avatar": "E"
  }
  ```
- `GET /api/coaches/[id]` - Get a specific coach
- `PUT /api/coaches/[id]` - Update a coach
  ```json
  {
    "name": "Updated Name",
    "color": "bg-green-500"
  }
  ```
- `DELETE /api/coaches/[id]` - Delete a coach

## Troubleshooting

### Connection Issues

**Error: "Connection refused"**
- Make sure PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Check if PostgreSQL is listening on port 5432: `lsof -i :5432`

**Error: "password authentication failed"**
- Verify username and password in `.env` file
- Check PostgreSQL authentication settings in `pg_hba.conf`

**Error: "database does not exist"**
- Make sure you created the database: `CREATE DATABASE scheduler_db;`
- Verify database name in `.env` matches the created database

### Reset Database

If you need to reset the database:

```bash
# Drop and recreate
psql -U postgres -c "DROP DATABASE scheduler_db;"
psql -U postgres -c "CREATE DATABASE scheduler_db;"

# Push schema and seed
npm run db:push
npm run db:seed
```

### View Logs

Enable query logging in Prisma client (already configured in `app/lib/prisma.ts`):

```typescript
new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

## Database Schema

### Coach Model

```prisma
model Coach {
  id        String   @id @default(cuid())
  name      String
  color     String
  avatar    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Useful Commands

```bash
# View database schema
npx prisma db pull

# Format Prisma schema
npx prisma format

# Open Prisma Studio
npx prisma studio

# View generated Prisma Client
npx prisma generate --watch
```
