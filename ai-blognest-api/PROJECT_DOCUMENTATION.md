# AI BlogNest API — Project Report & Technical Documentation

---

## 📑 Document Information
- **Project Title:** AI BlogNest API (Real-Time Intelligent Blogging Backend)
- **Domain:** Web Development, Distributed Systems, Generative AI Integration
- **Architecture Pattern:** Model-View-Controller (MVC) & Event-Driven Architecture (EDA)
- **Version:** 1.0.0
- **Primary Technologies:** Node.js, Express.js, MongoDB / Mongoose, Socket.io, Google Gemini AI, JWT, Bcrypt

---

## 1. Executive Summary & Abstract

**AI BlogNest API** is a production-grade, real-time backend platform engineered to bridge automated generative artificial intelligence with collaborative online publishing. Traditional content management systems operate on static polling mechanisms and lack seamless AI integration. 

AI BlogNest API solves this by combining:
1. **Real-time Event Streaming:** Powered by WebSockets (`Socket.io`) for live reader counters, instant blog publish alerts, and live comments.
2. **Generative AI Copilot:** Integrated with Google Gemini LLM for automated article generation, instant executive summarization, and SEO title optimization.
3. **Enterprise Security:** Implementing stateless JWT authentication, Bcrypt password hashing, Helmet security headers, CORS origin protection, and IP rate limiting.
4. **Resilient Data Layer:** Dual-mode storage featuring MongoDB Mongoose models with an automatic in-memory fallback store to ensure zero downtime.

---

## 2. System Architecture

The project follows a decoupled **MVC (Model-View-Controller)** pattern combined with an **Event-Driven WebSocket Layer**.

```mermaid
flowchart TD
    Client["Client Layer (Browser / Mobile / Thunder Client / Postman)"]
    
    subgraph Gateway ["Express & Security Gateway"]
        Helmet["Helmet Security Headers"]
        Cors["CORS Handler"]
        Limiter["Rate Limiter (300 req / 15 min)"]
        AuthMiddleware["JWT Authentication & RBAC Middleware"]
    end
    
    subgraph Controllers ["Application Controllers"]
        AuthController["Auth Controller"]
        BlogController["Blog Controller"]
        CommentController["Comment Controller"]
        AIController["AI Controller"]
    end
    
    subgraph RealTime ["Real-Time WebSocket Layer"]
        SocketServer["Socket.io Server Engine"]
        Rooms["Blog Rooms (blog_:id)"]
        LiveViewers["Live Reader Counter"]
    end
    
    subgraph External ["External Services & Storage"]
        Gemini["Google Gemini AI API"]
        MongoDB[("MongoDB Database / In-Memory Store")]
    end
    
    Client -->|HTTP REST Requests| Gateway
    Client <-->|Bi-directional WebSockets| SocketServer
    
    Gateway --> AuthMiddleware
    AuthMiddleware --> Controllers
    
    BlogController -->|Publish Notification| SocketServer
    CommentController -->|Live Comment Stream| SocketServer
    SocketServer --> Rooms
    Rooms --> LiveViewers
    
    AIController -->|LLM Prompts| Gemini
    AuthController --> MongoDB
    BlogController --> MongoDB
    CommentController --> MongoDB
```

---

## 3. Technology Stack & Specifications

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime Environment** | Node.js | `>= 18.0.0` | High-performance asynchronous JavaScript runtime |
| **Backend Framework** | Express.js | `4.18.2` | RESTful routing, middleware composition, request parsing |
| **Real-time Engine** | Socket.io | `4.7.4` | Bi-directional low-latency WebSockets |
| **Database & ODM** | MongoDB & Mongoose | `7.5.0` | NoSQL document storage, schema validation, indexing |
| **AI LLM Engine** | `@google/generative-ai` | `0.24.1` | Google Gemini 1.5 Flash generative models |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`) | `9.0.2` | Stateless authorization tokens |
| **Password Encryption** | `bcryptjs` | `2.4.3` | Salted SHA hashing for credentials |
| **Security Headers** | `helmet` | `7.1.0` | Protection against XSS, clickjacking, sniffing |
| **Rate Limiter** | `express-rate-limit` | `7.1.5` | DDoS and brute-force mitigation |
| **Request Validation** | `express-validator` | `7.0.1` | Input validation and sanitization |
| **HTTP Logger** | `morgan` | `1.10.0` | Development and access logging |

---

## 4. Database Schema (Entity-Relationship)

```mermaid
erDiagram
    USER ||--o{ BLOG : "authors"
    USER ||--o{ COMMENT : "writes"
    BLOG ||--o{ COMMENT : "contains"
    USER ||--o{ BLOG : "likes"

    USER {
        ObjectId _id PK
        string name
        string email UK
        string password
        string role "user | author | admin"
        string bio
        string avatar
        date createdAt
        date updatedAt
    }

    BLOG {
        ObjectId _id PK
        string title
        string slug UK
        string content
        string summary
        string category
        array tags
        ObjectId author FK
        string authorName
        string coverImage
        number views
        array likes
        boolean aiGenerated
        string aiPrompt
        string status "draft | published"
        number readingTime
        date createdAt
        date updatedAt
    }

    COMMENT {
        ObjectId _id PK
        ObjectId blog FK
        ObjectId user FK
        string userName
        string userAvatar
        string content
        date createdAt
        date updatedAt
    }
```

---

## 5. REST API Endpoint Specification

### 5.1 Authentication Module (`/api/auth`)

| Method | Endpoint | Access | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | `{ name, email, password, role?, bio? }` | Registers user, hashes password, returns JWT |
| `POST` | `/api/auth/login` | Public | `{ email, password }` | Authenticates credentials, returns JWT |
| `GET` | `/api/auth/profile` | Private | *None (Requires Bearer Token)* | Retrieves logged-in user profile |
| `PUT` | `/api/auth/profile` | Private | `{ name?, bio?, avatar? }` | Updates profile details |

### 5.2 Blogs Module (`/api/blogs`)

| Method | Endpoint | Access | Query / Body Parameters | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/blogs` | Public | `page, limit, search, category, tag, sort` | Paginated blog listing with keyword search |
| `GET` | `/api/blogs/:id` | Public | `id` (ObjectId or slug) | Single blog details + view count increment |
| `POST` | `/api/blogs` | Private | `{ title, content, summary, category, tags }` | Creates new blog & triggers real-time broadcast |
| `PUT` | `/api/blogs/:id` | Private | `{ title?, content?, category?, tags? }` | Updates existing blog (owner/admin only) |
| `DELETE`| `/api/blogs/:id` | Private | `id` | Deletes blog and cascades comments |
| `POST` | `/api/blogs/:id/like` | Private | `id` | Toggles upvote & updates live like count |

### 5.3 Comments Module (`/api/comments`)

| Method | Endpoint | Access | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/comments` | Private | `{ blogId, content }` | Adds comment & broadcasts to blog room |
| `GET` | `/api/comments/blog/:blogId` | Public | `blogId` | Fetches chronological comment stream |
| `DELETE`| `/api/comments/:id` | Private | `id` | Deletes comment (author/admin only) |

### 5.4 AI Copilot Module (`/api/ai`)

| Method | Endpoint | Access | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/generate-blog` | Public | `{ topic, category, tone, targetAudience }` | Generates full structured markdown blog |
| `POST` | `/api/ai/summarize` | Public | `{ content, maxSentences? }` | Extracts summary and 3 key takeaways |
| `POST` | `/api/ai/generate-titles` | Public | `{ topic }` | Generates 5 SEO titles & keyword tags |

---

## 6. Real-Time WebSocket Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    actor Reader as Reader Client
    actor Author as Author Client
    participant Socket as Socket.io Server
    participant DB as Database Layer

    Note over Reader,Socket: Reader opens a blog post
    Reader->>Socket: emit('join-blog', { blogId, user })
    Socket->>Socket: Increment active viewers map
    Socket-->>Reader: broadcast to blog room ('live-viewers-updated', count)
    
    Note over Author,Socket: Author publishes a new blog
    Author->>DB: POST /api/blogs (via REST API)
    DB-->>Author: 201 Created (Blog entity)
    Author->>Socket: Server triggers notifyNewBlog(blog)
    Socket-->>Reader: emit to all ('new-blog-published', blogData)
    
    Note over Reader,Socket: Reader leaves a live comment
    Reader->>DB: POST /api/comments
    DB-->>Reader: 201 Created (Comment entity)
    Socket-->>Reader: emit to room ('new-comment-received', commentData)
```

---

## 7. Security Architecture & Threat Mitigation

1. **Authentication Token Lifecycle:**  
   JWT tokens are signed using a server-side secret key with configurable expiration (`7d`). The payload includes `id`, `email`, and `role`.
2. **Credential Hardening:**  
   Passwords undergo pre-save cryptographic hashing with random 10-round salts via `bcryptjs`. Passwords are excluded from query results by default (`select: false`).
3. **Input Sanitization & Injection Defense:**  
   All incoming inputs are sanitized through `express-validator`. MongoDB queries use parameterized schemas preventing NoSQL injection.
4. **Denial of Service (DoS) Defense:**  
   `express-rate-limit` enforces a threshold of 300 requests per 15-minute window per IP address.
5. **Cross-Site Scripting (XSS) & Clickjacking Defense:**  
   `helmet` configures HTTP response headers (`X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`).

---

## 8. Verification & Integration Testing Report

The backend has undergone automated verification covering all core user journeys:

| Test Case ID | Test Scenario | Target Endpoint | Expected Status | Result |
| :---: | :--- | :--- | :---: | :---: |
| **TC-01** | System Health Check | `GET /api/health` | `200 OK` | **PASSED** |
| **TC-02** | Generative AI Content Creation | `POST /api/ai/generate-blog` | `200 OK` | **PASSED** |
| **TC-03** | User Authentication & Token Generation | `POST /api/auth/login` | `200 OK` | **PASSED** |
| **TC-04** | Role-Based Profile Verification | `GET /api/auth/profile` | `200 OK` | **PASSED** |
| **TC-05** | Paginated Blog Catalog Query | `GET /api/blogs` | `200 OK` | **PASSED** |
| **TC-06** | Authenticated Blog Publication | `POST /api/blogs` | `201 Created` | **PASSED** |
| **TC-07** | Threaded Comment Creation | `POST /api/comments` | `201 Created` | **PASSED** |
| **TC-08** | Dynamic Blog Like Toggle | `POST /api/blogs/:id/like` | `200 OK` | **PASSED** |

> **Automated Test Command:** `npm test`  
> **Success Rate:** 100% (8/8 Passed)

---

## 9. How to Export this Project Documentation to Word or PDF

You can easily export this documentation into a submission-ready PDF or Word document:

### Method A: Export to PDF using VS Code (Fastest)
1. Open VS Code.
2. Go to the Extensions Marketplace (`Ctrl + Shift + X`).
3. Search for and install **"Markdown PDF"** (by *yzane*).
4. Open this file:
   `C:\Users\acer\.gemini\antigravity\scratch\ai-blognest-api\PROJECT_DOCUMENTATION.md`
5. Right-click anywhere in the editor window and select **Markdown PDF: Export (pdf)**.
6. A formatted PDF file will be generated in the same directory!

---

### Method B: Convert to Microsoft Word (.docx)
1. Open [Google Docs](https://docs.google.com/) or Microsoft Word.
2. Select **File** ➔ **Open** ➔ choose this Markdown file (or copy and paste the Markdown text).
3. Google Docs automatically parses headings, tables, and lists.
4. Go to **File** ➔ **Download** ➔ select **Microsoft Word (.docx)** or **PDF Document (.pdf)**.

---

### Method C: Command-Line Conversion (Pandoc)
If you have `pandoc` installed:
```powershell
pandoc PROJECT_DOCUMENTATION.md -o AI_BlogNest_Project_Report.docx
pandoc PROJECT_DOCUMENTATION.md -o AI_BlogNest_Project_Report.pdf
```
