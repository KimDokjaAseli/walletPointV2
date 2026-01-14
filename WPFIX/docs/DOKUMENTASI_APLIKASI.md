# 📱 DOKUMENTASI WALLETPOINT
**Platform Wallet Point Gamifikasi Kampus**

---

## 🎯 OVERVIEW

**WalletPoint** adalah aplikasi manajemen poin digital berbasis gamifikasi untuk lingkungan kampus. Sistem ini mengintegrasikan **mission rewards**, **peer-to-peer transfers**, dan **marketplace redemption** dalam satu ekosistem wallet yang aman dan transparan.

### Tujuan Utama
- Meningkatkan motivasi mahasiswa melalui sistem reward berbasis poin
- Menyediakan ekonomi digital kampus yang terukur dan transparan
- Memfasilitasi transfer poin antar mahasiswa untuk kolaborasi

---

## 👥 ROLE & FITUR

### 1. **ADMIN**
**Wewenang:**
- ✅ Manajemen pengguna (CRUD user: Admin, Dosen, Mahasiswa)
- ✅ Manajemen produk marketplace (tambah, edit, hapus, stok)
- ✅ Monitoring seluruh transaksi (wallet, transfer, marketplace)
- ✅ Adjustment wallet (credit/debit manual)
- ✅ Audit log & reporting

**Use Case:**
- Mengatur katalog hadiah marketplace
- Menambah saldo mahasiswa (top-up events)
- Monitoring aktivitas mencurigakan
- Reset wallet jika terjadi error kritis

---

### 2. **DOSEN**
**Wewenang:**
- ✅ Membuat mission/quiz untuk mahasiswa
- ✅ Review & approve submission mahasiswa
- ✅ Memberikan reward poin setelah validasi tugas
- ✅ Monitoring submission status

**Use Case:**
- Buat mission: "Buat video kampanye Go Green" → reward 500 poin
- Review submission mahasiswa dan berikan nilai/poin
- Lihat riwayat mission yang dibuat

---

### 3. **MAHASISWA**
**Wewenang:**
- ✅ Browse & mengerjakan mission/quiz
- ✅ Submit tugas dan mendapat poin
- ✅ Transfer poin ke mahasiswa lain
- ✅ Redeem poin di marketplace (2 metode)
- ✅ Lihat leaderboard & riwayat transaksi

**Use Case:**
- Kerjakan quiz → auto grading → dapat poin
- Transfer 100 poin ke teman untuk biaya project kelompok
- Redeem voucher makan senilai 5000 poin via QR atau direct wallet

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Login Flow
1. User input **email + password**
2. Backend validasi kredensial menggunakan **bcrypt**
3. Generate **JWT Token** (expired 24 jam)
4. Token disimpan di `localStorage`
5. Setiap request API menyertakan header: `Authorization: Bearer <token>`

### Middleware
- **AuthMiddleware**: Validasi JWT token
- **RoleMiddleware**: Cek akses berdasarkan role (admin/dosen/mahasiswa)

---

## 💎 SISTEM WALLET & POIN

### Prinsip Dasar
- Setiap user memiliki **1 wallet** dengan **balance (poin)**
- Semua transaksi **atomic** menggunakan database transaction
- Balance **tidak boleh negatif** (constraint DB)
- Setiap mutasi wallet tercatat di `wallet_transactions`

### Jenis Transaksi
| Type | Direction | Penjelasan |
|------|-----------|-----------|
| `mission` | Credit | Reward selesai mission |
| `transfer_out` | Debit | Kirim poin ke user lain |
| `transfer_in` | Credit | Terima poin dari user lain |
| `marketplace` | Debit | Beli produk di marketplace |
| `adjustment` | Credit/Debit | Admin manual adjustment |
| `topup` | Credit | Top-up dari admin |

---

## 🛒 MARKETPLACE & PAYMENT SYSTEM

### Metode Pembayaran

#### **1. Direct Wallet Payment**
- Pembayaran langsung dari saldo poin
- **Flow:**
  1. User pilih produk → klik "Direct Wallet Pay"
  2. Backend cek balance cukup atau tidak
  3. Jika cukup → debit wallet, kurangi stok, buat transaksi
  4. Return success

#### **2. QR Code Payment** ⭐ NEW
- Pembayaran via QR (simulasi scan)
- **Flow:**
  1. User pilih produk → klik "Scan QR Payment"
  2. **Frontend request payment token** ke backend
  3. Backend generate token (format: `WPT-<timestamp>-<userID>`)
  4. Token disimpan di **in-memory map** dengan expiry 10 menit
  5. User "scan" QR (dalam UI, tombol confirm)
  6. Frontend kirim `product_id`, `payment_method: qr`, `payment_token`
  7. **Backend validasi:**
     - Token valid & belum expired?
     - Token milik user ini?
     - Amount sesuai dengan harga produk?
  8. Jika valid → token di-**consume** (dihapus), transaksi diproses
  9. Jika invalid → reject dengan error

**Enforcement:** Jika user belum scan QR (tidak kirim token valid), produk **TIDAK BISA** dibeli.

---

## 🎮 GAMIFICATION: MISSION & QUIZ

### Mission Types
1. **Quiz**: Multiple choice dengan auto-grading
2. **Task/Assignment**: Upload submission (URL/text) untuk review manual

### Mission Flow
**Mahasiswa:**
1. Browse mission di Discovery Hub
2. Kerjakan quiz (jawab pertanyaan) atau submit tugas
3. Submission masuk ke pending

**Dosen:**
1. Lihat daftar submission
2. Review & beri nilai
3. Approve → poin otomatis masuk ke wallet mahasiswa

---

## 🔄 PEER TRANSFER

### Transfer Flow
1. Mahasiswa A input **NIM penerima**, **amount**, **message**
2. Backend validasi:
   - Balance sender cukup?
   - Penerima valid?
3. **Atomic transaction:**
   - Debit wallet A
   - Credit wallet B
   - Buat 2 record transfer (sent/received)
4. Return success

### History
- **Sent**: Transfer yang dikirim
- **Received**: Transfer yang diterima
- **History**: Gabungan keduanya

---

## 🏗️ ARSITEKTUR SISTEM

### Backend (Go + Gin + GORM)
```
backend/
├── cmd/
│   ├── server/           # Main application
│   └── tools/            # Utility scripts
├── config/               # Database & env config
├── internal/
│   ├── auth/            # Login, register, JWT
│   ├── wallet/          # Wallet & transactions
│   ├── marketplace/     # Products & purchases
│   ├── mission/         # Missions & submissions
│   ├── transfer/        # P2P transfers
│   ├── audit/           # Activity logging
│   └── user/            # User management
├── middleware/          # Auth & CORS
├── routes/              # API routing
└── utils/               # Helper functions
```

### Frontend (Vanilla JS)
```
frontend/
├── pages/
│   ├── login.html
│   ├── admin.html
│   ├── dosen.html
│   └── mahasiswa.html
├── js/
│   ├── api.js           # API calls
│   ├── auth.js          # Login handler
│   ├── admin.js         # Admin features
│   ├── dosen.js         # Dosen features
│   └── mahasiswa.js     # Mahasiswa features
└── css/
    └── style.css        # Global styling
```

### Database (MySQL)
**Tables:**
- `users`: Data pengguna
- `wallets`: Saldo setiap user
- `wallet_transactions`: Riwayat transaksi
- `products`: Katalog marketplace
- `marketplace_transactions`: Pembelian produk
- `missions`: Tugas/quiz
- `mission_submissions`: Jawaban mahasiswa
- `questions`: Soal quiz
- `transfers`: Transfer P2P
- `audit_logs`: Activity logs

---

## 🔒 KEAMANAN

### 1. Password
- Hash menggunakan **bcrypt** (cost factor 10)
- Never store plaintext password

### 2. JWT Token
- Secret key dari environment variable
- Expiry: 24 jam
- Payload: `user_id`, `role`

### 3. Atomic Transaction
- Semua operasi wallet menggunakan **DB transaction**
- Jika 1 step gagal → **rollback semua**

### 4. QR Token Security
- Token **one-time use** (langsung dihapus setelah validasi)
- Expiry 10 menit
- Validasi ownership (token harus milik user yang request)
- Validasi amount (harus sesuai harga produk)

### 5. Authorization
- Setiap endpoint dijaga middleware role
- Mahasiswa tidak bisa akses endpoint admin/dosen

---

## 🚀 TEKNOLOGI

### Backend
- **Go 1.23** - Programming language
- **Gin** - HTTP framework
- **GORM** - ORM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **MySQL** - Database

### Frontend
- **Vanilla JavaScript** - No framework
- **CSS3** - Premium styling
- **Fetch API** - HTTP requests

### DevOps
- **Environment Variables** (.env)
- **CORS** enabled
- **Hot Reload** (development)

---

## 📊 FLOW DIAGRAM KUNCI

### Purchase dengan QR Payment
```
[User: Pilih Produk] 
    ↓
[Pilih "Scan QR Payment"]
    ↓
[Frontend: Request Token] → POST /mahasiswa/payment/token
    ↓
[Backend: Generate Token + Store in Memory]
    ↓
[Frontend: Tampilkan QR Modal]
    ↓
[User: Klik "Confirm Payment"]
    ↓
[Frontend: Send Purchase Request + Token] → POST /marketplace/purchase
    ↓
[Backend: Validate Token]
    ├─ Valid? → Process Purchase → Debit Wallet → Reduce Stock
    └─ Invalid? → Return Error: "Invalid/Expired Token"
    ↓
[Frontend: Show Success/Error]
```

---

## 🎯 UNIQUE SELLING POINTS

1. ✅ **Dual Payment Method** - Direct wallet + QR simulation untuk flexibility
2. ✅ **Gamification** - Mission & leaderboard untuk engagement
3. ✅ **Atomic Transactions** - Konsistensi data wallet terjamin
4. ✅ **Role-based Access** - Segregation yang jelas
5. ✅ **Audit Trail** - Semua aktivitas tercatat
6. ✅ **Real-time Balance** - Update instant setelah transaksi

---

## 📝 CATATAN IMPLEMENTASI

### QR Payment Token Management
- **In-Memory Storage**: Token disimpan di `map[string]*PaymentToken` dengan `sync.RWMutex`
- **Limitation**: Token hilang jika server restart (untuk production, gunakan Redis)
- **Benefit**: Fast access, no DB overhead

### Future Enhancements
- [ ] Push notification untuk transfer masuk
- [ ] Product rating system
- [ ] Mission deadline reminder
- [ ] Export transaction to CSV
- [ ] QR Code generator library (real QR image)

---

**© 2026 WalletPoint - Campus Digital Wallet System**
