require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { requireAdmin } = require('./middleware/authMiddleware');
const {
  createTicketSchema,
  updateStatusSchema,
  loginSchema,
  validateBody,
} = require('./validators/ticketValidator');

const REQUIRED_ENV = ['JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ (jpg, png, webp, gif) เท่านั้น'));
    }
    cb(null, true);
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง' },
});

const sendDiscordAlert = async (ticket) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    const payload = {
      embeds: [
        {
          title: `🚨 มีการแจ้งซ่อมใหม่! #${ticket.id}`,
          color: 5814783,
          fields: [
            { name: 'หัวข้อปัญหา', value: ticket.title, inline: false },
            { name: 'ผู้แจ้ง', value: ticket.reporter, inline: true },
            { name: 'หมวดหมู่', value: ticket.category, inline: true },
            { name: 'ความเร่งด่วน', value: ticket.priority, inline: true },
            { name: 'รายละเอียด', value: ticket.description, inline: false },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };
    await axios.post(webhookUrl, payload);
  } catch (error) {
    console.error('Error sending Discord notification:', error.message);
    if (error.response) {
      console.error('Discord API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
};

app.post('/api/auth/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;
    const validUsername = username === process.env.ADMIN_USERNAME;
    const validPassword = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

    if (!validUsername || !validPassword) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign({ sub: username, role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: '8h',
    });

    res.json({ token, expiresIn: '8h' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่' });
  }
});

app.get('/api/tickets', async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({ orderBy: { id: 'desc' } });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

app.post(
  '/api/tickets',
  upload.single('image'),
  validateBody(createTicketSchema),
  async (req, res) => {
    try {
      const { title, description, category, priority, reporter } = req.body;
      const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

      const newTicket = await prisma.ticket.create({
        data: {
          title,
          description,
          category,
          priority,
          reporter,
          image: imagePath,
          status: 'PENDING',
        },
      });

      await sendDiscordAlert(newTicket);

      io.emit('ticketUpdate');
      res.status(201).json(newTicket);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create ticket' });
    }
  },
);

app.put(
  '/api/tickets/:id/status',
  requireAdmin,
  validateBody(updateStatusSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updatedTicket = await prisma.ticket.update({
        where: { id: Number(id) },
        data: { status },
      });

      io.emit('ticketUpdate');
      res.json(updatedTicket);
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'ไม่พบ Ticket นี้ในระบบ' });
      }
      res.status(500).json({ error: 'Failed to update status' });
    }
  },
);

app.delete('/api/tickets/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.ticket.delete({ where: { id: Number(id) } });

    io.emit('ticketUpdate');
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'ไม่พบ Ticket นี้ในระบบ' });
    }
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('อนุญาตเฉพาะไฟล์รูปภาพ')) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด' });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { app, server, io, prisma }; 