# NovaPay Microservices Architecture

A high-performance, resilient, and observable payment processing system built with NestJS, MongoDB, Redis, and BullMQ.

## 🚀 Setup & Execution

### Prerequisites
- Docker & Docker Compose
- Node.js & npm (for local development)

### Running the Project
1. **Clone the repository.**
2. **Start all services:**
   ```bash
   docker compose up -d --build
   ```
3. **Access the Admin Dashboard:**
   Open **`http://localhost:8080`** in your browser.
4. **Seed Mock Data:**
   Use the **"Reset & Seed Users"** button in the dashboard to initialize 1000 users.

---

## 📡 API Endpoint Summary

| Endpoint | Method | Description | Example Request | Response |
|----------|--------|-------------|-----------------|----------|
| `/pay` | POST | Single P2P transfer | `{"sender": 1, "receiver": 2, "amount": 100}` | `{"status": "paid", "transactionId": "...", "rate": 0.79}` |
| `/payroll/process` | POST | Batch payroll (Bulk) | `{"sender": 1, "paylist": [...]}` | `{"status": "queued", "batchId": "..."}` |
| `/payroll/status/:id` | GET | Check batch status | `GET /payroll/status/batch_123` | `{"status": "completed", "progress": "100.00%"}` |
| `/wallet/balance` | GET | Check user balance | `GET /wallet/balance?userId=1` | `{"balance": 1000000}` |
| `/admin/ledgers` | GET | View all ledger entries | `GET /admin/ledgers` | `[{"account_id": "1", "type": "DEBIT", ...}]` |

---

## 🛡️ Idempotency Scenarios

1. **Duplicate Request ID**: The `transaction` service uses `transactionId` as a unique identifier. If the same ID is sent twice, the `user-wallet` service checks its `processed_transactions` array and skips the update if the ID exists.
2. **Gateway Retry**: The Gateway generates a deterministic `transactionId` based on `sender + length + minute` if none is provided, preventing accidental double-clicks from double-charging.
3. **Partial Failure Recovery**: If a wallet debit succeeds but a credit fails, the Ledger remains in `FAILED` status. The **Nightly Refund Job** detects these and restores funds.
4. **BullMQ Job Retries**: Payroll jobs are handled by BullMQ. If a worker dies mid-job, the job is moved back to the queue and re-attempted.
5. **Atomic Ledgers**: Ledger entries are written before wallet updates. If the wallet update fails, the ledger entries are explicitly marked as `FAILED` to prevent inconsistent state.

---

## ⚖️ Double-Entry Invariant

Every transaction leg is recorded using a **6-leg dual entry processing phase**:
1. **User Debit**: Sender's balance decreases.
2. **Pool Credit**: Settlement Pool (Source Currency) increases.
3. **Fee Debit**: Sender's fee amount.
4. **Fee Credit**: Platform Fee Account increases.
5. **Pool Debit**: Settlement Pool (Target Currency) decreases.
6. **User Credit**: Receiver's balance increases.

**Verification**: The system is balanced if `Sum(ALL Ledger Entries per Currency) == 0`. The Admin Dashboard provides visibility into these balanced legs.

---

## 💱 FX Quote Strategy

- **Strategy**: Single-use, TTL-based quotes.
- **Provider Failure**: The `fx` service implements mock volatility but follows a circuit-breaker pattern. If the rate provider fails, it throws a 500 which halts the transaction before money moves.
- **Enforcement**: Quotes are fetched and stored in Redis with a short expiry (TTL). Once used in a transaction, the quote is immediately cleared (`clear_rate`) to prevent re-use.

---

## 🔄 Payroll Resumability

Uses **BullMQ Flow Producer**:
- **Checkpoint Pattern**: A parent job (**`payroll-batch-complete`**) waits for multiple child jobs (**`payroll`**). 
- **State Management**: Each child job is a separate transaction. If the whole batch is interrupted, the parent job remains in `waiting-children` until all parts are resumed and completed.
- **Status Reporting**: Real-time progress is calculated by comparing `processed` vs `unprocessed` children.

---

## 🔗 Audit Hash Chain

The Ledger service maintains a cryptographic hash chain:
- **Hashing**: `current_hash = SHA256(data + previous_hash)`.
- **Tamper Detection**: If any record in the database is modified (amount changed, account ID swapped), the `current_hash` will no longer match the recalculated hash, and the `previous_hash` of the next block will be broken.
- **Verification**: The **Admin Integrity Check** validates the entire chain from block 0.

---

## 🚦 Tradeoffs & Future Improvements

### Tradeoffs made under time pressure:
- **String Settlement Pools**: Used simple string IDs for settlement pools instead of a full account hierarchy system.
- **In-Memory Mock FX**: Simulated FX rates instead of integration with a real provider (like OANDA).
- **Basic Auth**: Skipped full OAuth2 implementation in favor of a simpler Admin Dashboard.

### What to add before Production:
- **Database Partitioning**: Shariding/Partitioning for the Ledger as it grows into millions of entries.
- **Rate Limiting**: Implementation of Redis-based rate limiting on the Gateway.
- **Snapshotting**: Periodic snapshotting of account balances to speed up audit verification.
- **VPC Security**: Moving microservice TCP communication into a private VPC subnet.
