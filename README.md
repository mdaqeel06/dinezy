# 🍽️ Dinezy - Full-Stack Food Delivery Platform

**Dinezy** is a modern, full-stack food delivery platform that connects customers, restaurant kitchens, delivery riders, and administrators in a single seamless application.

It features secure **JWT user authentication**, **role-based access control (RBAC)**, an interactive **Leaflet delivery map**, **Razorpay online payments**, and **Redis memory caching** for lightning-fast menu loading.

---

## 📦 Packages & Technologies Used

### Frontend (User Interface)
Built with **React 19**, **TypeScript**, and **Vite**:

| Package | Purpose |
| :--- | :--- |
| **`react` & `react-dom`** | Core UI library for component-based architecture |
| **`vite`** | Next-generation frontend build tool and hot-reloading dev server |
| **`typescript`** | Static type checking for reliable, bug-free frontend code |
| **`lucide-react`** | Modern icon pack for navigation, buttons, and status badges |
| **`leaflet` & `@types/leaflet`** | Interactive GPS map for delivery addresses and rider routing |
| **Razorpay Checkout SDK** | Hosted payment modal for processing cards, UPI, and netbanking |

---

### Backend (API Server)
Built with **Python 3** and **FastAPI**:

| Package | Purpose |
| :--- | :--- |
| **`fastapi`** | Fast, modern web framework for building REST APIs with auto-generated docs |
| **`uvicorn`** | High-performance ASGI web server to run FastAPI |
| **`sqlalchemy`** | SQL toolkit and Object Relational Mapper (ORM) connected to SQLite |
| **`pydantic`** | Data validation, serialization, and API request/response models |
| **`bcrypt`** | Industry-standard password hashing algorithm with salt |
| **`pyjwt`** | Generates and verifies JSON Web Tokens (JWT) for user sessions |
| **`redis`** | Connects to Redis for in-memory caching of menus and restaurant catalogs |
| **`razorpay`** | Official Python SDK to create payment orders and verify cryptographic signatures |
| **`python-dotenv`** | Loads configuration secrets from the `.env` file |

---

## 🔄 How the Application Works (From Beginning to End)

Dinezy provides tailored experiences for **four user roles**:

```
[1. Customer] Orders food & pays via Razorpay
      │
      ▼
[2. Restaurant Manager] Accepts order & assigns delivery rider
      │
      ▼
[3. Delivery Partner] Picks up order & follows live map to deliver
      │
      ▼
[4. Super Admin] Monitors platform analytics & manages user roles
```

### 1. Sign-In & Role Detection
* When a user signs in, the backend checks their credentials with **Bcrypt** and issues a 24-hour **JWT access token**.
* The app automatically loads the appropriate dashboard based on their role:
  * **Customer:** Browse food, cart, and live order tracking.
  * **Restaurant Manager:** Kitchen order queue, rider assignment, and menu management.
  * **Delivery Partner:** Dispatch requests, GPS delivery map, and earnings ledger.
  * **Super Admin:** Platform revenue, total orders, and user management.

### 2. Fast Menu Browsing with Redis Caching
* When a customer opens the app, the backend checks **Redis memory** first.
* If cached (**Cache HIT**), the restaurant and menu list is returned in **under 2 milliseconds** without querying the database!
* If not cached (**Cache MISS**), the backend loads the data from the database, stores it in Redis with a **5-minute expiration (TTL)**, and serves the customer.

### 3. Placing an Order & Paying with Razorpay
* The customer adds dishes to their basket and clicks **Checkout**.
* The backend creates a pending order in the database and requests an `order_id` from Razorpay.
* Razorpay's secure checkout modal opens. The customer enters payment details (Card, UPI, Netbanking).
* Once the bank approves the payment, Razorpay generates a cryptographic **HMAC SHA-256 signature**.
* Our backend independently verifies this signature. If valid, the order status changes to **Paid** and instantly appears on the restaurant kitchen's live screen.

### 4. Kitchen Preparation & Rider Assignment
* The **Restaurant Manager** receives the paid order in their dashboard and clicks **Accept**.
* The manager chooses an available delivery partner from the online rider list and clicks **Assign**.

### 5. Rider Delivery & Interactive Map
* The **Delivery Partner** receives an incoming delivery alert with pickup and drop-off addresses.
* Once accepted, the rider sees a step-by-step progress stepper:
  * **Pickup from Restaurant** $\rightarrow$ **Out for Delivery** $\rightarrow$ **Delivered**.
* An interactive **Leaflet map** shows the restaurant location, customer address, and route coordinates.
* Upon completion, the customer's screen updates to **Delivered**, and the rider's earnings ledger updates.

### 6. Menu Updates & Automatic Cache Invalidation
* If a restaurant manager updates a dish price, adds a new item, or toggles an item to **Out of Stock**, the backend **automatically wipes the Redis cache**.
* The next customer who loads the menu gets 100% fresh, accurate data immediately without having to wait for the 5-minute timer to expire.

---

## ⚙️ Configuration & Setup

### 1. Environment Variables (`.env`)
Create a `.env` file inside the `backend` folder (or copy from `backend/.env.sample`):

```env
# 1. Redis Connection (Cloud or Local)
REDIS_URL=redis://default:your_password@your_host:port

# 2. Razorpay Payment Gateway (Test Mode)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# 3. Security (Optional - has default fallback)
JWT_SECRET_KEY=dinezy-super-secure-secret-key-for-jwt-auth-2026-production
```

> **Note on Redis:** If Redis is not configured or temporarily unreachable, Dinezy automatically falls back to the database directly, so the application never crashes!

---

### 2. Running the Backend (FastAPI)

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install Python packages
pip install -r requirements.txt

# 3. Start the server
python run.py
```
* **API Server:** http://localhost:8000
* **Interactive Swagger Docs:** http://localhost:8000/docs

---

### 3. Running the Frontend (React + Vite)

In a new terminal window:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node packages
npm install

# 3. Start development server
npm run dev
```
* **Web Application:** http://localhost:5173

---

## 👥 Pre-Configured Demo Accounts

For quick testing without typing, the login modal includes **1-click Quick Demo Sign-In** buttons:

| Role | Email | Password | What You Can Test |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@dinezy.com` | `admin123` | Platform analytics, promote/demote roles, delete users |
| **Restaurant Manager** | `marco@dinezy.com` | `password123` | Accept orders, assign riders, edit menu & toggle availability |
| **Customer** | `alex@dinezy.com` | `password123` | Browse catalog, add to cart, pay with Razorpay |
| **Delivery Partner** | `leo@dinezy.com` | `password123` | Toggle online/offline, accept trips, complete delivery |
