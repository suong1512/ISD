# Order Management System

## 🚀 Quick Start (Máy mới pull code về)

### Yêu cầu
- **Node.js** >= 16
- **MySQL** >= 8.0 (đang chạy)

### Bước 1: Cài dependencies
```bash
cd Backend
npm install
```

### Bước 2: Tạo file .env
Tạo file `Backend/.env` với nội dung:
```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=order_system
```

### Bước 3: Setup database (1 lệnh duy nhất)
```bash
npm run db:setup
```
Lệnh này sẽ tự động:
1. Tạo database `order_system`
2. Tạo tất cả tables (schema)
3. Chạy migrations
4. Import toàn bộ data thật từ `data_dump.sql`

### Bước 4: Chạy server
```bash
npm run dev
```

---

## 📦 Database Scripts

| Lệnh | Mô tả |
|-------|--------|
| `npm run db:setup` | **Setup toàn bộ** — Tạo DB + tables + import data (dùng cho máy mới) |
| `npm run db:export` | **Export data** — Dump toàn bộ data hiện tại ra file `Database/data_dump.sql` |
| `npm run db:import` | **Import data** — Import data từ file `data_dump.sql` vào DB local |
| `npm run db:migrate` | Chạy migrations (cập nhật schema) |
| `npm run db:seed` | Import data mẫu từ `seed.sql` |

### Workflow chia sẻ data cho team:
1. **Người có data gốc** chạy: `npm run db:export`
2. **Commit** file `Database/data_dump.sql` lên git
3. **Người pull code** chạy: `npm run db:setup`
4. ✅ Done! Database trên máy mới sẽ có toàn bộ data giống hệt

---

## 📁 Project Structure
```
Order System/
├── Backend/
│   ├── app.js              # Entry point
│   ├── .env                # Environment config (không commit)
│   ├── scripts/
│   │   ├── setup-db.js     # Full database setup
│   │   ├── export-data.js  # Export data to SQL
│   │   ├── import-data.js  # Import data from SQL
│   │   ├── migrate.js      # Run migrations
│   │   └── seed.js         # Seed sample data
│   └── src/
│       ├── config/         # Database config
│       ├── controllers/    # Route handlers
│       ├── routes/         # API routes
│       └── services/       # Business logic
├── Database/
│   ├── schema.sql          # Database schema
│   ├── seed.sql            # Sample data
│   └── data_dump.sql       # Full data dump (auto-generated)
└── Frontend/
    └── ...
```
