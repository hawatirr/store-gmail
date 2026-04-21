const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Inisialisasi Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️  Error: SUPABASE_URL dan SUPABASE_KEY harus diatur di file .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

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

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({ 
                success: false, 
                message: error.message 
            });
        }

        // Cek apakah user adalah admin
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

        res.json({
            success: true,
            message: 'Login berhasil',
            user: {
                id: data.user.id,
                email: data.user.email,
                role: userProfile?.role || 'user'
            },
            token: data.session.access_token
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

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            return res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }

        // Simpan profile user
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
                id: data.user.id,
                nama_lengkap,
                email,
                role: 'user'
            }]);

        if (profileError) {
            console.error('Profile error:', profileError);
        }

        res.json({
            success: true,
            message: 'Registrasi berhasil. Silakan login.',
            user: {
                id: data.user.id,
                email: data.user.email
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
        
        if (token) {
            await supabase.auth.admin.signOut(token);
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

// Get all data (protected - admin only)
app.get('/api/data', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token tidak valid' 
            });
        }

        const token = authHeader.split(' ')[1];
        
        // Verifikasi token
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized' 
            });
        }

        // Cek role admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Akses ditolak. Hanya admin yang dapat mengakses.' 
            });
        }

        // Ambil semua data
        const { data: records, error } = await supabase
            .from('data_records')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }

        res.json({
            success: true,
            data: records
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
app.post('/api/data', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token tidak valid' 
            });
        }

        const token = authHeader.split(' ')[1];
        
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized' 
            });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
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

        const { data: newData, error } = await supabase
            .from('data_records')
            .insert([{
                judul,
                deskripsi,
                kategori: kategori || 'Umum',
                status: status || 'active',
                created_by: user.id
            }])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }

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
app.put('/api/data/:id', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token tidak valid' 
            });
        }

        const token = authHeader.split(' ')[1];
        const { id } = req.params;
        const updates = req.body;

        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized' 
            });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Akses ditolak. Hanya admin yang dapat mengakses.' 
            });
        }

        const { data: updatedData, error } = await supabase
            .from('data_records')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }

        res.json({
            success: true,
            message: 'Data berhasil diperbarui',
            data: updatedData
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
app.delete('/api/data/:id', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token tidak valid' 
            });
        }

        const token = authHeader.split(' ')[1];
        const { id } = req.params;

        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized' 
            });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Akses ditolak. Hanya admin yang dapat mengakses.' 
            });
        }

        const { error } = await supabase
            .from('data_records')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }

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
        message: 'Backend berjalan dengan baik',
        timestamp: new Date().toISOString()
    });
});

// Setup admin user (hanya untuk development/initial setup)
app.post('/api/setup-admin', async (req, res) => {
    try {
        const { email, password, nama_lengkap } = req.body;
        
        // Default values jika tidak disediakan
        const adminEmail = email || 'admin@gmail.store';
        const adminPassword = password || 'admin';
        const adminName = nama_lengkap || 'Administrator';

        // Cek apakah user sudah ada
        const { data: existingUsers, error: fetchError } = await supabase.auth.admin.listUsers();
        
        if (fetchError) {
            console.error('Error checking existing users:', fetchError);
        }

        // Coba buat user admin baru
        const { data, error } = await supabase.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true,
            user_metadata: {
                nama_lengkap: adminName,
                role: 'admin'
            }
        });

        if (error && error.message.includes('already been registered')) {
            return res.json({
                success: true,
                message: 'User admin sudah ada',
                email: adminEmail
            });
        }

        if (error) {
            console.error('Create admin error:', error);
            // Fallback: coba sign up biasa
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: adminEmail,
                password: adminPassword
            });
            
            if (signUpError) {
                return res.status(400).json({
                    success: false,
                    message: signUpError.message
                });
            }
            
            // Set role admin di profiles table
            await supabase.from('profiles').upsert([{
                id: signUpData.user.id,
                nama_lengkap: adminName,
                email: adminEmail,
                role: 'admin'
            }]);
            
            return res.json({
                success: true,
                message: 'Admin user created with basic signup',
                email: adminEmail
            });
        }

        // Set role admin di profiles table
        await supabase.from('profiles').upsert([{
            id: data.user.id,
            nama_lengkap: adminName,
            email: adminEmail,
            role: 'admin'
        }]);

        res.json({
            success: true,
            message: 'Admin user berhasil dibuat',
            email: adminEmail,
            userId: data.user.id
        });

    } catch (error) {
        console.error('Setup admin error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Terjadi kesalahan pada server' 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🚀 Server Backend Berjalan!          ║
║   Port: ${PORT}                          ║
║   URL: http://localhost:${PORT}          ║
╚════════════════════════════════════════╝
    `);
});
