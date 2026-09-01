const { z } = require('zod');

const CATEGORIES = ['Hardware', 'Software', 'Network', 'Printer'];
const PRIORITIES = ['NORMAL', 'URGENT', 'CRITICAL'];
const STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

const createTicketSchema = z.object({
  title: z.string().trim().min(3, 'หัวข้อปัญหาต้องมีอย่างน้อย 3 ตัวอักษร').max(150),
  description: z.string().trim().min(5, 'กรุณาอธิบายอาการเสียอย่างน้อย 5 ตัวอักษร').max(2000),
  reporter: z.string().trim().min(2, 'กรุณาระบุชื่อผู้แจ้ง').max(100),
  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: `หมวดหมู่ต้องเป็นหนึ่งใน: ${CATEGORIES.join(', ')}` }),
  }),
  priority: z.enum(PRIORITIES, {
    errorMap: () => ({ message: `ความเร่งด่วนต้องเป็นหนึ่งใน: ${PRIORITIES.join(', ')}` }),
  }).default('NORMAL'),
});

const updateStatusSchema = z.object({
  status: z.enum(STATUSES, {
    errorMap: () => ({ message: `สถานะต้องเป็นหนึ่งใน: ${STATUSES.join(', ')}` }),
  }),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return res.status(400).json({
        error: firstIssue?.message || 'ข้อมูลที่ส่งมาไม่ถูกต้อง',
        details: result.error.issues,
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  createTicketSchema,
  updateStatusSchema,
  loginSchema,
  validateBody,
  CATEGORIES,
  PRIORITIES,
  STATUSES,
};