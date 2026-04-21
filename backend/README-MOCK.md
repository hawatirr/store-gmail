# Backend Mock - GMAIL.STORE

Backend sederhana menggunakan **mock data** (tanpa database) untuk demo dan testing.

## 🚀 Cara Menjalankan

```bash
cd backend
node server-mock.js
```

Server akan berjalan di `http://localhost:3000`

## 🔐 Login Default

- **Email:** `admin@gmail.store`
- **Password:** `admin`

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/login` | Login user |
| POST | `/api/register` | Register user baru |
| POST | `/api/logout` | Logout user |

### Data Management (Admin Only)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/data` | Ambil semua data |
| POST | `/api/data` | Tambah data baru |
| PUT | `/api/data/:id` | Update data |
| DELETE | `/api/data/:id` | Hapus data |

### Utility

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/health` | Cek status server |

## 📝 Contoh Request

### Login
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.store","password":"admin"}'
```

### Get Data (dengan token)
```bash
curl -X GET http://localhost:3000/api/data \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Add Data
```bash
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "judul": "Gmail Fresh",
    "deskripsi": "test@example.com|pass123|recovery@test.com",
    "kategori": "Fresh",
    "status": "available"
  }'
```

## ⚠️ Catatan Penting

1. **Data disimpan di memory** - Semua data akan hilang saat server restart
2. **Tidak ada hashing password** - Hanya untuk demo, jangan gunakan di production!
3. **Token sederhana** - Menggunakan mock token, bukan JWT yang aman

## 🔄 Migrasi ke Production

Untuk production, ganti `server-mock.js` dengan `server.js` yang menggunakan Supabase:

1. Setup database di [Supabase](https://supabase.com)
2. Update file `.env` dengan kredensial Supabase
3. Jalankan `node server.js`

## 🛠️ Tech Stack

- Express.js
- CORS
- dotenv
- Mock data (in-memory storage)
