# E-Commerce Backend API

A Node.js/Express-based REST API backend for an e-commerce platform with product management, user authentication, shopping cart, and admin features.

## Overview

This is a full-featured e-commerce backend that powers the e-commerce prototype application. It provides APIs for:

- User authentication and authorization
- Product catalog management
- Shopping cart functionality
- Category and brand management
- Product attributes
- Content management (blocks and home sections)
- Admin user management

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js v5.1.0
- **Database**: MongoDB (via Mongoose v8.14.0)
- **Authentication**: JWT (JSON Web Token)
- **Password Hashing**: bcrypt v5.1.1
- **File Upload**: Multer v2.0.2 + Cloudinary
- **CORS**: Cross-Origin Resource Sharing enabled
- **Environment**: dotenv v16.5.0

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB database
- Cloudinary account (for image uploads)

### Installation

1. **Install dependencies**

```bash
npm install
```

2. **Configure environment variables**
   Create `.env` file in the root directory:


3. **Start the server**

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## Available Scripts

| Script     | Command                                                 | Description                      |
| ---------- | ------------------------------------------------------- | -------------------------------- |
| `dev`      | `nodemon server.js` | Start dev server with hot reload |
| `start`    | `node server.js`    | Start production server          |

## Project Structure

```
backend/
├── app.js                      # Express app configuration
├── server.js                   # Server entry point
├── package.json                # Project dependencies
├── config.js                   # Configuration loader
│
├── controllers/                # Business logic
│   ├── userController.js       # User auth & profile
│   ├── product.controller.js   # Product CRUD operations
│   ├── cartController.js       # Shopping cart operations
│   ├── categoryController.js   # Category management
│   ├── brandController.js      # Brand management
│   ├── attributes.collection.js # Product attributes
│   ├── adminUser.controller.js # Admin user management
│   ├── content.block.controller.js
│   └── home.section.controller.js
│
├── models/                     # MongoDB schemas
│   ├── userModel.js            # User schema
│   ├── product.model.js        # Product schema
│   ├── cartModel.js            # Shopping cart schema
│   ├── categoryModel.js        # Category schema
│   ├── brand.model.js          # Brand schema
│   ├── attributes.model.js     # Product attributes schema
│   ├── adminUserModel.js       # Admin user schema
│   ├── content.block.model.js
│   └── home.section.model.js
│
├── routers/                    # API route definitions
│   ├── userRouter.js
│   ├── product.router.js
│   ├── cartRouter.js
│   ├── categoryRouter.js
│   ├── brand.router.js
│   ├── attribute.routes.js
│   ├── adminUser.router.js
│   ├── content.block.routes.js
│   └── home.sections.routes.js
│
├── middlewares/                # Custom middleware
│   ├── authentication.js       # User authentication
│   ├── authentication2.js      # Additional auth logic
│   ├── authenticateAdmin.js    # Admin authorization
│   └── multer.js               # File upload configuration
│
├── utils/                      # Utility functions
│   ├── bcrypt.js               # Password hashing utilities
│   ├── getToken.js             # JWT token generation
│   ├── getPassword.js          # Password utility
│   ├── verifyPassword.js       # Password verification
│   ├── cloudinary.js           # Cloudinary integration
│   ├── uploadToCloudinary.js   # Image upload helper
│   ├── generateSlug.js         # URL slug generation
│   └── adminToken.js           # Admin token utilities
│
├── sample_images/              # Sample image storage
└── create_product.js           # Product creation script
    sampleCreation.js           # Sample data generator
```

## Key Features

### 🔐 Authentication & Authorization

- User registration and login with JWT tokens
- Admin authentication with role-based access control
- Password encryption using bcrypt
- Secure cookie-based session management

### 📦 Product Management

- Full CRUD operations for products
- Product attributes and variations
- Multiple product images stored on Cloudinary
- Product categorization and brand association
- Search and filtering capabilities

### 🛒 Shopping Cart

- Add/remove items from cart
- Update item quantities
- Cart persistence

### 👤 User Management

- User registration and profile management
- Order history tracking
- Admin user management

### 📂 Content Management

- Content blocks for CMS functionality
- Home page section management
- Dynamic page content

### 🏷️ Catalog Management

- Categories and subcategories
- Brands
- Product attributes (size, color, etc.)

## CORS Configuration

The API allows requests from these origins:

- `https://ecom-prototype-one.vercel.app` (Production)
- `http://localhost:5173` (Frontend dev)
- `http://localhost:3000` (Alternative frontend)

Credentials and all standard HTTP methods are enabled (GET, POST, PUT, PATCH, DELETE).

## API Response Format

All API responses follow a consistent JSON structure:

**Success Response:**

```json
{
  "message": "Operation successful"
}
```

**Error Response:**

```json
{
  "message": "Operation failed"
}
```

## Error Handling

The API includes comprehensive error handling:

- Validation errors with detailed messages
- Authentication/Authorization errors
- Database operation errors
- File upload errors
- Network errors

## Security Features

- **CORS Protection**: Whitelist-based origin validation
- **JWT Protection**: Secure token-based authentication
- **Admin Authorization**: Role-based access control
- **Password Security**: bcrypt hashing with salt rounds
- **File Upload**: Validation and secure Cloudinary storage
- **Input Validation**: Request validation at middleware level

## Rate Limiting

(Note: Currently not implemented. Consider adding express-rate-limit for production)

## Logging

Console logging is currently in place. For production, consider implementing:

- Winston or Morgan for structured logging
- Log file persistence
- Log rotation


### Database Connection Failed

- Verify `CONNECTION_STRING` is correct
- Ensure MongoDB service is running
- Check network connectivity to MongoDB server

### JWT Errors

- Verify `JWT_SECRET` is set in environment variables
- Check token expiration
- Ensure token format is correct (Bearer token)


### CORS Errors

- Verify frontend URL is in `allowedURLs` array in app.js
- Check credentials flag in fetch/axios requests
- Ensure headers are properly configured
