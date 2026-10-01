# ⚡ AI BlogNest API

> **Production-Ready Real-Time RESTful & WebSocket API for Intelligent Blogging**  
> Built with **Node.js, Express, MongoDB, Mongoose, JWT Authentication, Bcrypt, Google Gemini AI, and Socket.io**.

---

## 🌟 Key Features

- **🔐 Robust Authentication & Security**:
  - Secure password hashing using `bcryptjs`.
  - Stateless JSON Web Token (`JWT`) authentication with customizable expiry.
  - Role-Based Access Control (`user`, `author`, `admin`).
  - Security headers powered by `helmet`, CORS isolation, and IP rate limiting with `express-rate-limit`.

- **⚡ Real-Time Capabilities (Socket.io)**:
  - **Live Reader Counter**: Dynamically tracks how many users are actively viewing a blog room in real time.
  - **Instant Notification Broadcasts**: When any author publishes a new blog post, connected readers receive an immediate broadcast notification.
  - **Real-Time Commenting**: Live comment feed without requiring page refreshes.
  - **Live Like Counter**: Instant like/unlike count synchronization.

- **🤖 Google Gemini AI Integration**:
  - **AI Blog Post Generator**: Generates comprehensive, SEO-optimized, markdown-formatted blog posts from a simple topic prompt.
  - **AI Summarizer**: Extracts executive summaries and key bulleted takeaways from long articles.
  - **AI Title & SEO Generator**: Suggests catchy, high-converting titles and relevant SEO tags.
  - **Graceful Fallback Mode**: Works out-of-the-box in simulation mode even before configuring a Gemini API key.

- **📝 Complete Blog & Comment Management (MVC)**:
  - Full CRUD operations on blogs and comments.
  - Automatic slug generation and reading time calculation.
  - Advanced search (title, content, summary), category filtering, tag filtering, and pagination.
  - In-memory database fallback to ensure seamless local testing without MongoDB installation hurdles.

- **💻 Interactive Browser Playground**:
  - Built-in interactive dashboard served directly at `http://localhost:5000` to test REST endpoints and live WebSockets directly from your browser.

- **🧪 Thunder Client & Postman Ready**:
  - Pre-configured collections (`thunder-collection.json` and `thunder-environment.json`) ready to import with 1 click.

---

## 📂 Project Architecture

```
ai-blognest-api/
├── package.json               # Dependencies and scripts
├── .env.example               # Environment variables template
├── .env                       # Local environment configuration
├── thunder-collection.json    # Thunder Client / Postman request collection
├── thunder-environment.json   # Environment variables for API client
├── README.md                  # Project documentation
├── public/
│   └── index.html             # Interactive Real-Time Test Dashboard & Client UI
└── src/
    ├── server.js              # Application entrypoint (HTTP + Socket.io server)
    ├── app.js                 # Express application configuration & middlewares
    ├── config/
    │   ├── db.js              # Mongoose database connection with fallback
    │   └── ai.js              # Google Gemini AI configuration
    ├── models/
    │   ├── User.js            # User Schema (bcrypt hashing, roles, avatar)
    │   ├── Blog.js            # Blog Schema (slug, tags, likes, views, readingTime)
    │   └── Comment.js         # Comment Schema
    ├── controllers/
    │   ├── authController.js  # Registration, login, profile management
    │   ├── blogController.js  # CRUD, filtering, pagination, likes
    │   ├── aiController.js    # Gemini AI blog generation & summarization
    │   └── commentController.js # Blog comments management
    ├── routes/
    │   ├── authRoutes.js      # /api/auth routes
    │   ├── blogRoutes.js      # /api/blogs routes
    │   ├── commentRoutes.js   # /api/comments routes
    │   └── aiRoutes.js        # /api/ai routes
    ├── middlewares/
    │   ├── authMiddleware.js  # JWT verification & role authorization
    │   ├── validateMiddleware.js # express-validator results checker
    │   └── errorMiddleware.js # 404 and global error handlers
    ├── socket/
    │   └── socketHandler.js   # Real-time WebSocket event broadcaster
    └── utils/
        ├── token.js           # JWT signing and verification helper
        ├── apiResponse.js     # Standardized JSON response envelope
        └── memoryStore.js     # In-memory storage fallback with seed data
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18.0.0 or later)
- **npm** (v9.0.0 or later)
- *(Optional)* **MongoDB** (Local or MongoDB Atlas connection string)
- *(Optional)* **Google Gemini API Key** (Free key from [Google AI Studio](https://aistudio.google.com/))

### 2. Installation
Open your terminal in the project directory:

```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Review or edit `.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/ai_blognest_db
JWT_SECRET=your_super_secret_jwt_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
CLIENT_ORIGIN=*
```

> **Note**: If MongoDB or Gemini API Key is not yet configured, the server will **automatically run in graceful fallback mode**, allowing you to test all authentication, blog, and AI generation flows immediately!

### 4. Run the Server

**Development Mode (with auto-restart via nodemon):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

Once started, the server will output:
```
====================================================
🚀 AI BlogNest API Server is running!
📡 URL: http://localhost:5000
⚡ Real-time Socket.io active on port: 5000
📚 Health check: http://localhost:5000/api/health
🌍 Environment: development
====================================================
```

---

## 📡 Real-Time WebSocket Events (Socket.io)

Connect your frontend client to `http://localhost:5000`:

| Event Emitted by Client | Payload | Description |
| :--- | :--- | :--- |
| `join-blog` | `{ blogId, user }` | Joins a blog room to receive real-time updates and increments the live reader counter |
| `leave-blog` | `{ blogId }` | Leaves a blog room and decrements the live reader counter |
| `comment-typing` | `{ blogId, userName, isTyping }` | Sends live typing indicator to other readers in the blog room |

| Event Emitted by Server | Payload | Description |
| :--- | :--- | :--- |
| `live-viewers-updated` | `{ blogId, liveViewers, message }` | Broadcast to all room viewers when reader count changes |
| `new-blog-published` | `{ message, blog }` | Global broadcast to all connected clients when a new blog is created |
| `new-comment-received`| `{ blogId, comment }` | Broadcast to the specific blog room when a reader posts a comment |
| `blog-like-updated` | `{ blogId, likesCount, likedBy }` | Broadcast to the specific blog room when someone likes the blog |

---

## 📖 REST API Endpoints Reference

### 🟢 1. Health Check
- **`GET /api/health`**  
  Returns service status, database connectivity, and active AI configuration.

---

### 🟡 2. Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new user (`name`, `email`, `password`, `role`) |
| `POST` | `/api/auth/login` | Public | Login with email & password, returns JWT token |
| `GET` | `/api/auth/profile` | Private | Retrieve authenticated user profile |
| `PUT` | `/api/auth/profile` | Private | Update name, bio, or avatar |

#### Sample Register Request:
```json
POST /api/auth/register
Content-Type: application/json

{
  "name": "Jane Developer",
  "email": "jane@example.com",
  "password": "Password123",
  "role": "author",
  "bio": "Building real-time full stack applications."
}
```

---

### 🔵 3. Blogs (`/api/blogs`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/blogs` | Public | List blogs with pagination, search, and category filters |
| `GET` | `/api/blogs/:id` | Public | Get single blog by ID or Slug (increments view count) |
| `POST` | `/api/blogs` | Private | Create a new blog post (triggers Socket broadcast) |
| `PUT` | `/api/blogs/:id` | Private | Update an existing blog post (author or admin only) |
| `DELETE` | `/api/blogs/:id` | Private | Delete a blog post (author or admin only) |
| `POST` | `/api/blogs/:id/like` | Private | Toggle like on a blog post (triggers Socket broadcast) |

#### Query Parameters for `GET /api/blogs`:
- `page`: Page number (default: `1`)
- `limit`: Number of items per page (default: `10`)
- `search`: Search keyword in title, summary, or content
- `category`: Filter by category (e.g. `Technology`, `AI`)
- `tag`: Filter by tag name
- `sort`: `newest` (default) or `popular`

---

### 🟣 4. Comments (`/api/comments`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/comments` | Private | Add comment to a blog (triggers Socket broadcast) |
| `GET` | `/api/comments/blog/:blogId` | Public | Retrieve all comments for a blog post |
| `DELETE` | `/api/comments/:id` | Private | Delete a comment (author or admin only) |

---

### 🔴 5. AI Features (`/api/ai`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/generate-blog` | Public | Generate a complete structured Markdown blog with Gemini AI |
| `POST` | `/api/ai/summarize` | Public | Summarize text and extract key takeaways |
| `POST` | `/api/ai/generate-titles` | Public | Generate 5 viral blog titles and SEO keywords |

#### Sample AI Generation Request:
```json
POST /api/ai/generate-blog
Content-Type: application/json

{
  "topic": "Real-Time Event Driven Architectures with WebSockets",
  "category": "Technology",
  "tone": "engaging",
  "targetAudience": "Software Engineers"
}
```

---

## 🧪 Testing with Thunder Client or Postman

1. Open **VS Code** with the **Thunder Client** extension installed (or open **Postman**).
2. Click **Collections** ➔ **Import**.
3. Select `thunder-collection.json` located in the project root.
4. Click **Environments** ➔ **Import** and select `thunder-environment.json`.
5. Run the **Login User** request to automatically acquire an auth token.
6. Test all protected and AI routes seamlessly!

---

## 💻 Interactive Playground
Open your browser and navigate to:
```
http://localhost:5000
```
Use the interactive dashboard to:
- Monitor live WebSocket connections.
- Generate AI blog content instantly.
- Publish a blog and watch real-time notification events pop up dynamically.
- Test authentication and profile queries.

---

## 📜 License
This project is open-source and available under the **ISC License**.
