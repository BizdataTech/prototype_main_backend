# Setup Guide

## Prerequisites

- Node.js v16 or higher
- MongoDB database (local or cloud instance)
- Cloudinary account (for image uploads)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This installs all required packages including:

- Express.js (web framework)
- Mongoose (MongoDB ODM)
- JWT (authentication)
- bcrypt (password hashing)
- Multer (file uploads)
- Cloudinary (image storage)
- CORS (cross-origin support)

### 2. Create Environment Configuration

Create a `.env` file (or `.env.development` for dev mode) in the root directory with the following variables:

```
PORT=1000
CONNECTION_STRING=mongodb://your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

**Configuration Details:**

- `PORT` - Server port (default: 1000)
- `CONNECTION_STRING` - MongoDB connection URL
- `JWT_SECRET` - Secret key for JWT token signing
- `CLOUDINARY_*` - Cloudinary API credentials for image uploads

### 3. Start the Server

**Development Mode (with hot-reload):**

```bash
npm run dev
```

**Production Mode:**

```bash
npm start
```

### 4. Sample Scripts (Optional)

Generate sample data:

```bash
npm run products     # Create sample products
npm run create       # Create sample product data
```

## CORS Configuration

The server allows requests from:

- `https://ecom-prototype-one.vercel.app`
- `http://localhost:5173`
- `http://localhost:3000`

To add more origins, edit the `allowedURLs` array in `app.js`.

## Database Connection

MongoDB connection is established via Mongoose in `server.js`. The application waits for successful database connection before starting the server.

**Success Message:**

```
Database connected
Server listening for request via port 1000
```

## Available Routes

The API uses the `/api` prefix for all endpoints:

- `/api/auth/*` - User authentication
- `/api/admin-users/*` - Admin management
- `/api/products/*` - Product management
- `/api/categories/*` - Category management
- `/api/brands/*` - Brand management
- `/api/attributes/*` - Product attributes
- `/api/cart/*` - Shopping cart
- `/api/content-blocks/*` - Content management
- `/api/home-sections/*` - Homepage sections

## Project Structure

```
backend/
├── app.js                    # Express app setup
├── server.js                 # Entry point
├── config.js                 # Environment config
├── controllers/              # Business logic
├── models/                   # MongoDB schemas
├── routers/                  # API routes
├── middlewares/              # Authentication & file upload
├── utils/                    # Helper functions
└── sample_images/            # Static assets
```
