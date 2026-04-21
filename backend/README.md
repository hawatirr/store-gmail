# Backend API Documentation

## Setup Database Supabase

Jalankan SQL berikut di Supabase SQL Editor:

```sql
-- Tabel profiles untuk menyimpan data user
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nama_lengkap TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel data_records untuk menyimpan data aplikasi
CREATE TABLE data_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  judul TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  kategori TEXT DEFAULT 'Umum',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_records ENABLE ROW LEVEL SECURITY;

-- Policies untuk profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Insert profile on signup"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policies untuk data_records
CREATE POLICY "Anyone can view active records"
  ON data_records FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can view all records"
  ON data_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert records"
  ON data_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update records"
  ON data_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete records"
  ON data_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers untuk auto-update
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_records_updated_at
  BEFORE UPDATE ON data_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create admin user (optional - jalankan setelah register user pertama)
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

## Konfigurasi Environment

Edit file `.env` dan isi dengan kredensial Supabase Anda:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
PORT=3000
```

## Menjalankan Server

### Development Mode (dengan auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server akan berjalan di `http://localhost:3000`

## API Endpoints

### Authentication

#### POST `/api/login`
Login user
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login berhasil",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  },
  "token": "jwt-token-here"
}
```

#### POST `/api/register`
Registrasi user baru
```json
{
  "email": "user@example.com",
  "password": "password123",
  "nama_lengkap": "John Doe"
}
```

#### POST `/api/logout`
Logout user

### Data Management (Admin Only)

Semua endpoint data memerlukan header Authorization:
```
Authorization: Bearer <token>
```

#### GET `/api/data`
Ambil semua data records

#### POST `/api/data`
Tambah data baru
```json
{
  "judul": "Judul Data",
  "deskripsi": "Deskripsi lengkap",
  "kategori": "Kategori",
  "status": "active"
}
```

#### PUT `/api/data/:id`
Update data
```json
{
  "judul": "Judul Updated",
  "status": "inactive"
}
```

#### DELETE `/api/data/:id`
Hapus data

### Health Check

#### GET `/api/health`
Cek status server

## Membuat Admin User

Setelah registrasi user pertama, jalankan SQL ini di Supabase:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'email-user-anda@example.com';
```

## Struktur Folder

```
backend/
├── .env              # Environment variables
├── server.js         # Main server file
├── package.json      # Dependencies & scripts
└── README.md         # Dokumentasi ini
```
