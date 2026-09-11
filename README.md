# Inventory Management System (FIFO)

A production-ready, real-time event-driven Inventory Management System using Node.js, PostgreSQL, Apache Kafka (Redpanda), and EJS templates for the frontend UI.

## Architecture

```
User (EJS UI)
    ↓
Node.js / Express API
    ↓ (REST, Auth, Sessions)
PostgreSQL (Inventory & Transactions)

Kafka Producer (API)
    ↓
inventory-events (Topic)
    ↓
Kafka Consumer (Service)
    ↓ (Idempotency Check + Transactions + Row Locking)
Inventory Service
    ↓
PostgreSQL (Tables: batches, sales, allocations)
```

## FIFO Logic

First-In, First-Out (FIFO) ensures that the oldest available inventory batch is consumed first during a sale.

**Example Scenario:**
- Batch 1: 100 units @ ₹100
- Batch 2: 50 units @ ₹120

**Sale of 120 units:**
- **FIFO:** Takes 100 units from Batch 1, and 20 units from Batch 2.
- **Cost Calculation:** (100 × 100) + (20 × 120) = ₹12,400
- **Remaining Inventory:** 30 units from Batch 2 @ ₹120.

## Database Design

- `processed_events`: Ensures Kafka message idempotency using the `event_id` unique constraint.
- `products`: Master list of inventory items.
- `inventory_batches`: Represents each purchase. Contains `original_quantity`, `remaining_quantity`, and `unit_cost`. The critical index `idx_batches_fifo` optimizes the FIFO query on `remaining_quantity > 0`.
- `sales`: Aggregated sale records containing `total_cost`.
- `sale_batch_allocations`: An audit trail mapping exactly how many units were taken from which specific `inventory_batches` for a given sale.

## Transaction & Concurrency Strategy

Sales are processed inside an **atomic PostgreSQL transaction**.
- **Row Locking:** `SELECT ... FOR UPDATE` locks the required inventory batch rows.
- **Concurrent Protection:** If two concurrent sales target the same product, the second transaction is blocked until the first completes.
- **Fail Fast:** If insufficient inventory is available, the transaction immediately issues a `ROLLBACK` to prevent negative stock or double consumption.

## Kafka & Idempotency

- **Producer:** Sends `purchase` and `sale` events to `inventory-events`.
- **Consumer:** Manual offset management (`autoCommit: false`).
- **Idempotency:** Before processing, the consumer checks the `processed_events` table. If the `event_id` exists, the event is skipped, but the Kafka offset is still committed.
- **Commit Strategy:** Kafka offsets are committed **only** after the PostgreSQL transaction successfully commits.

## REST API Endpoints

- `GET /api/health` — API, PostgreSQL, and Kafka health status.
- `POST /api/auth/login` — Authenticate and receive JWT token/cookie.
- `GET /api/products` — List all products.
- `GET /api/inventory` — Aggregated inventory stock and FIFO cost.
- `GET /api/ledger` — Paginated transaction ledger history.
- `POST /api/simulator/events` — Send an array of events to the Kafka topic.

## Local Setup

### 1. Prerequisites
- **Node.js:** v24.19.0+
- **PostgreSQL:** Local instance (v16+ recommended).
- **Docker:** Required to run Redpanda (Kafka).

### 2. Database Preparation
Create a PostgreSQL database named `inventory_db`:
```bash
createdb -U postgres inventory_db
```
Update the `DATABASE_URL` in `backend/.env` with your correct PostgreSQL credentials.

### 3. Start Kafka (Redpanda)
```bash
docker-compose up -d
```

### 4. Install Dependencies
```bash
cd backend
npm install
```

### 5. Run Database Migrations
```bash
npm run migrate
```

### 6. Start the Backend Server
```bash
npm run dev
```

### 7. Access the Application
Open your browser and navigate to:
**http://localhost:3000**

- **Username:** admin
- **Password:** admin123

## Simulator

You can use the built-in UI simulator button on the dashboard, or run the command line script:
```bash
npm run simulate
```
This pushes 7 realistic purchase/sale events (including multi-batch consumption) into Kafka.
