# API Endpoints Guide

All endpoints are prefixed with `/api`

---

## Authentication

### User Authentication

| Method | Endpoint          | Auth | Description             |
| ------ | ----------------- | ---- | ----------------------- |
| POST   | `/auth/register`  | No   | Create new user account |
| POST   | `/auth/sign-in`   | No   | User login              |
| GET    | `/auth/verify/me` | JWT  | Verify logged-in user   |
| POST   | `/auth/logout`    | JWT  | User logout             |

### Admin Authentication

| Method | Endpoint               | Auth  | Description          |
| ------ | ---------------------- | ----- | -------------------- |
| POST   | `/admin-users/sign-up` | No    | Create admin account |
| POST   | `/admin-users/sign-in` | No    | Admin login          |
| GET    | `/admin-users/verify`  | Admin | Verify admin user    |
| POST   | `/admin-users/logout`  | Admin | Admin logout         |

---

## Admin Management

| Method | Endpoint                          | Auth  | Description        |
| ------ | --------------------------------- | ----- | ------------------ |
| GET    | `/admin-users/clients`            | Admin | Get all users      |
| PATCH  | `/admin-users/clients/:id/status` | Admin | Update user status |
| DELETE | `/admin-users/clients/:id`        | Admin | Delete user        |

---

## Products

| Method | Endpoint        | Auth  | Description                        |
| ------ | --------------- | ----- | ---------------------------------- |
| GET    | `/products`     | No    | Get all products                   |
| GET    | `/products/:id` | No    | Get single product                 |
| POST   | `/products`     | No    | Create product (with image upload) |
| PATCH  | `/products/:id` | No    | Update product (with image upload) |
| DELETE | `/products/:id` | Admin | Delete product                     |

**Notes:**

- POST/PATCH accept `image` field as multipart/form-data
- Images are uploaded to Cloudinary

---

## Categories

| Method | Endpoint                                | Auth | Description                          |
| ------ | --------------------------------------- | ---- | ------------------------------------ |
| GET    | `/auto-categories`                      | No   | Get all categories                   |
| GET    | `/auto-categories/:id`                  | No   | Get category by ID                   |
| GET    | `/categories/:id/attribute-collections` | No   | Get category's attribute collections |
| POST   | `/auto-categories`                      | No   | Create category                      |
| PUT    | `/auto-categories/:id`                  | No   | Update category                      |
| DELETE | `/auto-categories/:id`                  | No   | Delete category                      |

---

## Brands

| Method | Endpoint      | Auth  | Description                      |
| ------ | ------------- | ----- | -------------------------------- |
| GET    | `/brands`     | No    | Get all brands                   |
| GET    | `/brands/:id` | No    | Get brand by ID                  |
| POST   | `/brands`     | Admin | Create brand (with image upload) |
| PATCH  | `/brands/:id` | Admin | Update brand (with image upload) |
| DELETE | `/brands/:id` | Admin | Delete brand                     |

**Notes:**

- Image upload required for POST/PATCH
- Admin authentication required

---

## Product Attributes

| Method | Endpoint                                  | Auth  | Description                    |
| ------ | ----------------------------------------- | ----- | ------------------------------ |
| GET    | `/attribute-collections`                  | No    | Get all attribute collections  |
| GET    | `/attribute-collections/category`         | No    | Get collections for category   |
| GET    | `/attribute-collections/:id`              | No    | Get attribute collection by ID |
| POST   | `/attribute-collections`                  | Admin | Create attribute collection    |
| POST   | `/attribute-collections/:id`              | Admin | Add attributes to collection   |
| PATCH  | `/attribute-collections/:coll_id/:att_id` | Admin | Update attribute               |
| DELETE | `/attribute-collections/:coll_id`         | Admin | Delete entire collection       |
| DELETE | `/attribute-collections/:coll_id/:att_id` | Admin | Delete single attribute        |

---

## Shopping Cart

| Method | Endpoint | Auth | Description      |
| ------ | -------- | ---- | ---------------- |
| GET    | `/cart`  | JWT  | Get user's cart  |
| POST   | `/cart`  | JWT  | Add item to cart |
| DELETE | `/cart`  | JWT  | Clear cart       |

**Auth:** Requires valid user JWT token

---

## Content Blocks

| Method | Endpoint              | Auth  | Description            |
| ------ | --------------------- | ----- | ---------------------- |
| GET    | `/content-blocks`     | No    | Get all content blocks |
| GET    | `/content-blocks/:id` | No    | Get block by ID        |
| POST   | `/content-blocks`     | Admin | Create content block   |
| PATCH  | `/content-blocks/:id` | Admin | Update content block   |

---

## Home Sections

| Method | Endpoint                          | Auth | Description                       |
| ------ | --------------------------------- | ---- | --------------------------------- |
| GET    | `/home-sections`                  | No   | Get all home sections             |
| GET    | `/home-sections/references/:type` | No   | Get references by type            |
| POST   | `/home-sections`                  | No   | Create home section (file upload) |

**Notes:**

- Accepts any file type for upload via `multipart/form-data`
- Files uploaded to Cloudinary

---

## Authentication Types

- **No Auth** - Publicly accessible
- **JWT** - User authentication token (cookie: `token`)
- **Admin** - Admin authentication token (cookie: `admin_token`)

## Error Responses

- `401` - Authentication required or token invalid/expired
- `400` - Bad request / validation error
- `404` - Resource not found
- `500` - Server error

## CORS Allowed Headers

- `GET, POST, PUT, PATCH, DELETE`
- Credentials: Enabled (cookies allowed)

---

## Quick Reference

**Base URL:** `http://localhost:4000/api` (local development)

**Headers:**

```json
{
  "Content-Type": "application/json"
}
```

**Cookies:**

- User: `token` (JWT)
- Admin: `admin_token` (JWT)
