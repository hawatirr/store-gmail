const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ==================== MOCK DATA ====================

// Simpan user dalam memory (untuk demo)
let users = [
    {
        id: '1',
        email: 'admin@gmail.store',
        password: 'admin', // Dalam production, gunakan hash!
        nama_lengkap: 'Administrator',
        role: 'admin'
    }
];

// Simpan data records dalam memory
let dataRecords = [
    {
        id: '1',
        judul: 'Gmail Fresh Account',
        deskripsi: 'test@example.com|password123|recovery@test.com',
        kategori: 'Fresh',
        status: 'available',
        created_by: '1',
        created_at: new Date().toISOString()
    },
    {
        id: '2',
        judul: 'Gmail Aged Account',
        deskripsi: 'aged@example.com|securepass|backup@test.com',
        kategori: 'Aged',
        status: 'available',
        created_by: '1',
        created_at: new Date().toISOString()
    }
];

// Session tokens (mock)
let sessions = {};

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email dan password wajib diisi' 
            });
        }

        // Cari user
        const user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email atau password salah' 
            });
        }

        // Generate token sederhana
        const token = `mock_token_${user.id}_${Date.now()}`;
        sessions[token] = {
            userId: user.id,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 jam
        };

        res.json({
            success: true,
            message: 'Login berhasil',
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            token: token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, nama_lengkap } = req.body;

        if (!email || !password || !nama_lengkap) {
            return res.status(400).json({ 
                success: false, 
                message: 'Semua field wajib diisi' 
            });
        }

        // Cek apakah email sudah ada
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email sudah terdaftar' 
            });
        }

        // Buat user baru
        const newUser = {
            id: `${users.length + 1}`,
            email,
            password, // Dalam production, gunakan hash!
            nama_lengkap,
            role: 'user'
        };

        users.push(newUser);

        res.json({
            success: true,
            message: 'Registrasi berhasil. Silakan login.',
            user: {
                id: newUser.id,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Logout
app.post('/api/logout', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (token && sessions[token]) {
            delete sessions[token];
        }

        res.json({
            success: true,
            message: 'Logout berhasil'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// ==================== DATA ROUTES ====================

// Middleware untuk verifikasi token
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token tidak valid' 
        });
    }

    const token = authHeader.split(' ')[1];
    const session = sessions[token];

    if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token expired atau tidak valid' 
        });
    }

    // Attach user info ke request
    const user = users.find(u => u.id === session.userId);
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            message: 'User tidak ditemukan' 
        });
    }

    req.user = user;
    next();
}

// Get all data (protected - admin only)
app.get('/api/data', verifyToken, async (req, res) => {
    try {
        // Cek role admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Akses ditolak. Hanya admin yang dapat mengakses.' 
            });
        }

        // Ambil semua data
        res.json({
            success: true,
            data: dataRecords
        });

    } catch (error) {
        console.error('Get data error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Create data (protected - admin only)
app.post('/api/data', verifyToken, async (req, res) => {
    try {
        // Cek role admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Akses ditolak. Hanya admin yang dapat mengakses.' 
            });
        }

        const { judul, deskripsi, kategori, status } = req.body;

        if (!judul || !deskripsi) {
            return res.status(400).json({ 
                success: false, 
                message: 'Judul dan deskripsi wajib diisi' 
            });
        }

        const newData = {
            id: `${dataRecords.length + 1}`,
            judul,
            deskripsi,
            kategori: kategori || 'Umum',
            status: status || 'available',
            created_by: req.user.id,
            created_at: new Date().toISOString()
        };

        dataRecords.push(newData);

        res.json({
            success: true,
            message: 'Data berhasil ditambahkan',
            data: newData
        });

    } catch (error) {
        console.error('Create data error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Update data (protected - admin only)
app.put('/api/data/:id', verifyToken, async (req, res) => {
    try {
        // Cek role admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Akses ditolak. Hanya admin yang dapat mengakses.' 
            });
        }

        const { id } = req.params;
        const updates = req.body;

        const index = dataRecords.findIndex(r => r.id === id);
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Data tidak ditemukan' 
            });
        }

        dataRecords[index] = { ...dataRecords[index], ...updates };

        res.json({
            success: true,
            message: 'Data berhasil diperbarui',
            data: dataRecords[index]
        });

    } catch (error) {
        console.error('Update data error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Delete data (protected - admin only)
app.delete('/api/data/:id', verifyToken, async (req, res) => {
    try {
        // Cek role admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Akses ditolak. Hanya admin yang dapat mengakses.' 
            });
        }

        const { id } = req.params;
        const index = dataRecords.findIndex(r => r.id === id);
        
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Data tidak ditemukan' 
            });
        }

        dataRecords.splice(index, 1);

        res.json({
            success: true,
            message: 'Data berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete data error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Backend berjalan dengan baik (Mode Demo)',
        timestamp: new Date().toISOString(),
        stats: {
            totalUsers: users.length,
            totalRecords: dataRecords.length,
            activeSessions: Object.keys(sessions).length
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🚀 Server Backend Berjalan!          ║
║   Mode: DEMO (Mock Data)               ║
║   Port: ${PORT}                          ║
║   URL: http://localhost:${PORT}          ║
║                                        ║
║   Default Login:                       ║
║   Email: admin@gmail.store             ║
║   Password: admin                      ║
╚════════════════════════════════════════╝
    `);
});
