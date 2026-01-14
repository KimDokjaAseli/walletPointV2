# Platform Wallet Point Gamifikasi Kampus - System Flow

## 📋 Table of Contents
1. [Authentication Flow](#authentication-flow)
2. [Mission & Task Flow](#mission--task-flow)
3. [Transfer Flow](#transfer-flow)
4. [Marketplace Flow](#marketplace-flow)
5. [External Points Flow](#external-points-flow)

---

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as API Gateway
    participant Auth as Auth Service
    participant DB as Database
    
    U->>F: Enter credentials
    F->>API: POST /auth/login
    API->>Auth: Validate credentials
    Auth->>DB: Query user by email
    DB-->>Auth: User data
    Auth->>Auth: Verify password (bcrypt)
    
    alt Valid credentials
        Auth->>Auth: Generate JWT token
        Auth->>DB: Insert audit log
        Auth-->>API: JWT + user data
        API-->>F: 200 OK + token
        F->>F: Store token
        F-->>U: Redirect to dashboard
    else Invalid credentials
        Auth-->>API: 401 Unauthorized
        API-->>F: Error response
        F-->>U: Show error message
    end
```

**Steps**:
1. User enters email & password
2. Frontend sends POST /auth/login
3. Auth service validates credentials
4. Generate JWT token with role & user_id
5. Return token to frontend
6. Frontend stores token (localStorage/session)
7. All subsequent requests include Authorization header

---

## 🎯 Mission & Task Flow

```mermaid
flowchart TD
    Start([Dosen Login]) --> CreateMission[Dosen: Create Mission/Task]
    CreateMission --> SetReward[Set Points Reward & Deadline]
    SetReward --> PublishMission[Publish Mission]
    
    PublishMission --> StudentView[Mahasiswa: View Available Missions]
    StudentView --> Submit[Mahasiswa: Submit Completion]
    Submit --> UploadData[Upload Text/Link/File]
    UploadData --> StatusPending[Status: PENDING]
    
    StatusPending --> DosenReview[Dosen: Review Submission]
    DosenReview --> ValidateChoice{Approve or Reject?}
    
    ValidateChoice -->|Approve| CreateTransaction[Create Wallet Transaction]
    CreateTransaction --> CreditWallet[Credit Student Wallet]
    CreditWallet --> UpdateStatus1[Status: APPROVED]
    UpdateStatus1 --> NotifyStudent1[Notify Student]
    
    ValidateChoice -->|Reject| UpdateStatus2[Status: REJECTED]
    UpdateStatus2 --> NotifyStudent2[Notify Student + Note]
    
    NotifyStudent1 --> End([End])
    NotifyStudent2 --> End
```

**Detailed Steps**:

### A. Dosen Creates Mission
```http
POST /dosen/missions
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "title": "Complete Lab Report",
  "description": "Submit lab report for Physics experiment",
  "points_reward": 100,
  "deadline": "2026-01-20T23:59:59Z",
  "status": "active"
}
```

**Backend**:
1. Validate JWT (role = dosen)
2. Insert into `missions` table
3. Return mission ID

### B. Mahasiswa Submits Mission
```http
POST /mahasiswa/missions/{mission_id}/submit
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

{
  "submission_content": "I have completed the lab report...",
  "file": [uploaded file]
}
```

**Backend**:
1. Validate JWT (role = mahasiswa)
2. Check deadline
3. Check if already submitted (UNIQUE constraint)
4. Upload file to storage
5. Insert into `mission_submissions` (status = 'pending')
6. Return submission ID

### C. Dosen Validates Submission
```http
POST /dosen/missions/submissions/{submission_id}/validate
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "action": "approve",  // or "reject"
  "validation_note": "Great work!"
}
```

**Backend (Atomic Transaction)**:
```go
BEGIN TRANSACTION

1. SELECT mission_id, student_id, points_reward FROM mission_submissions
   WHERE id = submission_id FOR UPDATE

2. UPDATE mission_submissions
   SET status = 'approved', validated_by = dosen_id, validated_at = NOW()
   WHERE id = submission_id

3. INSERT INTO wallet_transactions
   (wallet_id, type, amount, direction, reference_id, status, created_by)
   VALUES (student_wallet_id, 'mission', points_reward, 'credit', submission_id, 'success', 'dosen')

4. UPDATE wallets SET balance = balance + points_reward WHERE id = student_wallet_id

5. INSERT INTO audit_logs (action, table_name, record_id, user_id)
   VALUES ('APPROVE_MISSION', 'mission_submissions', submission_id, dosen_id)

COMMIT
```

---

## 💸 Transfer Flow

```mermaid
sequenceDiagram
    participant S as Sender (Mahasiswa)
    participant F as Frontend
    participant API as API Gateway
    participant TS as Transfer Service
    participant DB as Database
    
    S->>F: Initiate transfer
    F->>F: Scan QR / Enter NIM
    F->>API: POST /mahasiswa/transfer
    API->>TS: Process transfer request
    
    TS->>DB: BEGIN TRANSACTION
    TS->>DB: Lock sender wallet (FOR UPDATE)
    DB-->>TS: Current balance
    
    alt Sufficient balance
        TS->>DB: INSERT into transfers
        TS->>DB: INSERT wallet_transaction (debit sender)
        TS->>DB: UPDATE sender wallet balance
        TS->>DB: INSERT wallet_transaction (credit receiver)
        TS->>DB: UPDATE receiver wallet balance
        TS->>DB: COMMIT
        DB-->>TS: Success
        TS-->>API: Transfer successful
        API-->>F: 200 OK
        F-->>S: Show success message
    else Insufficient balance
        TS->>DB: ROLLBACK
        TS-->>API: Insufficient balance
        API-->>F: 400 Bad Request
        F-->>S: Show error message
    end
```

**Request**:
```http
POST /mahasiswa/transfer
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "receiver_nim": "2023002",
  "amount": 50,
  "note": "Payment for group project"
}
```

**Atomic Transaction**:
```sql
CALL sp_process_transfer(sender_wallet_id, receiver_wallet_id, amount, note, 
    @transfer_id, @success, @message);
```

---

## 🛒 Integrated Commerce & QR Flow

```mermaid
flowchart TD
    Start([Mahasiswa Login]) --> Selection{Select Action}
    
    %% Marketplace Branch
    Selection -->|Marketplace| BrowseProducts[Browse Products]
    BrowseProducts --> SelectProduct[Select Product]
    SelectProduct --> CheckStock{Stock Available?}
    CheckStock -->|No| OutOfStock[Show Out of Stock]
    CheckStock -->|Yes| CheckBalance{Balance Sufficient?}
    
    %% Peer Transfer Branch
    Selection -->|Peer Transfer| ScanReceiver[Scan Receiver QR / Enter NIM]
    ScanReceiver --> EnterAmount[Enter Transfer Amount]
    EnterAmount --> CheckBalance
    
    %% Integrated Payment Execution
    CheckBalance -->|No| InsufficientBalance[Show Insufficient Balance]
    CheckBalance -->|Yes| OpenWallet[Open Digital Wallet]
    
    OpenWallet --> GenerateToken[System: Generate QR Payment Token]
    GenerateToken --> ScanAction[Mahasiswa: Scan QR / Confirm Payment]
    
    ScanAction --> ProcessTransaction[System: Process QRIS/BY point Transaction]
    ProcessTransaction --> AtomicTX[Atomic DB Transaction: Debit, Credit, Stock, Logs]
    
    AtomicTX --> TransactionLog[Transaction Logged in Ledger]
    TransactionLog --> Receipt[Generate Payment Receipt]
    Receipt --> End([End])
    
    OutOfStock --> End
    InsufficientBalance --> End
```

**Integrated Commerce Steps**:

### A. Point Usage (Marketplace or Peer-to-Peer)
**Workflow**:
1. **Selection**: Mahasiswa chooses to buy an item or transfer points.
2. **Payment Token**: System validates initial constraints (stock/balance) and generates a temporary transaction token.
3. **QR Interaction**: Mahasiswa scans the QR code (for marketplace) or confirms identified recipient (for transfer).
4. **Processing**: Backend executes an atomic transaction:
   - For Marketplace: `Debit Wallet` -> `Decrement Stock` -> `Log Marketplace Transaction`
   - For Transfer: `Debit Sender` -> `Credit Receiver` -> `Log Transfer`
5. **Finalization**: Transaction is recorded in the immutable Ledger, and a Receipt is shown to the user.

**Atomic DB Level (sp_process_transaction)**:
```sql
BEGIN;
  -- 1. Identity Verification
  -- 2. Balance & Stock Locking
  -- 3. Point Movement (Debit/Credit)
  -- 4. Audit & Receipt Logging
COMMIT;
```

---

## 🌐 External Points Flow

```mermaid
sequenceDiagram
    participant EXT as External System
    participant CRON as Cron Job
    participant API as API Gateway
    participant ES as External Service
    participant DB as Database
    participant W as Wallet
    
    Note over CRON: Every 1 hour
    CRON->>API: GET /admin/external/sync
    API->>ES: Fetch active external sources
    ES->>DB: SELECT * FROM external_sources WHERE status='active'
    DB-->>ES: External sources
    
    loop For each source
        ES->>EXT: Call external API
        EXT-->>ES: Return transactions
        
        loop For each transaction
            ES->>DB: Check if already synced (external_transaction_id)
            
            alt Not synced
                ES->>DB: BEGIN TRANSACTION
                ES->>DB: INSERT external_point_logs
                ES->>DB: INSERT wallet_transaction (credit)
                ES->>DB: UPDATE wallet balance
                ES->>DB: UPDATE wallet.last_sync_at
                ES->>DB: COMMIT
            else Already synced
                ES->>ES: Skip (duplicate prevention)
            end
        end
    end
    
    ES-->>API: Sync complete
    API-->>CRON: 200 OK
```

**Manual Sync Request**:
```http
POST /admin/external/sync
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "source_id": 1,
  "user_nim": "2023001"
}
```

**Backend Process**:
```go
// 1. Call external API
response := callExternalAPI(source.APIEndpoint, user.NimNip)

// 2. Validate response
for _, txn := range response.Transactions {
    // 3. Check duplicate
    exists := db.Where("external_transaction_id = ?", txn.ID).First(&ExternalPointLog{}).Error
    if exists == nil {
        continue // Skip
    }
    
    // 4. Create transaction (atomic)
    tx := db.Begin()
    
    // Insert log
    log := ExternalPointLog{
        WalletID: wallet.ID,
        ExternalSourceID: source.ID,
        ExternalTransactionID: txn.ID,
        Amount: txn.Amount,
        Metadata: txn.Metadata,
        Status: "success",
    }
    tx.Create(&log)
    
    // Credit wallet
    walletTx := WalletTransaction{
        WalletID: wallet.ID,
        Type: "external",
        Amount: txn.Amount,
        Direction: "credit",
        ReferenceID: log.ID,
        Status: "success",
        CreatedBy: "system",
    }
    tx.Create(&walletTx)
    
    // Update balance
    tx.Model(&wallet).Update("balance", gorm.Expr("balance + ?", txn.Amount))
    tx.Model(&wallet).Update("last_sync_at", time.Now())
    
    tx.Commit()
}
```

---

## 🔄 Activity Diagram: Complete System Flow

```mermaid
flowchart TD
    Start([User Access System]) --> Login{Login}
    Login --> CheckRole{Check Role}
    
    CheckRole -->|Admin| AdminDashboard[Admin Dashboard]
    CheckRole -->|Dosen| DosenDashboard[Dosen Dashboard]
    CheckRole -->|Mahasiswa| MahasiswaDashboard[Mahasiswa Dashboard]
    
    AdminDashboard --> AdminActions{Select Action}
    AdminActions -->|Manage Users| ManageUsers[CRUD Users]
    AdminActions -->|Manage Products| ManageProducts[CRUD Products]
    AdminActions -->|Adjust Points| AdjustPoints[Manual Point Adjustment]
    AdminActions -->|View Reports| ViewReports[View All Transactions]
    
    DosenDashboard --> DosenActions{Select Action}
    DosenActions -->|Create Mission| CreateMission[Create Mission/Task]
    DosenActions -->|Validate| ValidateSubmissions[Validate Student Submissions]
    DosenActions -->|Monitor| MonitorStudents[View Student Progress]
    
    MahasiswaDashboard --> MahasiswaActions{Select Action}
    MahasiswaActions -->|View Wallet| ViewWallet[View Balance & History]
    MahasiswaActions -->|Submit| SubmitMission[Submit Mission/Task]
    MahasiswaActions -->|Transfer| TransferPoints[Transfer to Peer]
    MahasiswaActions -->|Shop| ShopMarketplace[Buy from Marketplace]
    MahasiswaActions -->|Sync| SyncExternal[Sync External Points]
    
    ManageUsers --> End([Logout])
    ManageProducts --> End
    AdjustPoints --> End
    ViewReports --> End
    CreateMission --> End
    ValidateSubmissions --> End
    MonitorStudents --> End
    ViewWallet --> End
    SubmitMission --> End
    TransferPoints --> End
    ShopMarketplace --> End
    SyncExternal --> End
```

---

**Version**: 1.0  
**Last Updated**: 2026-01-13
