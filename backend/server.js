const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'super-secret-jwt-key-for-dev';

app.use(cors());
app.use(express.json());

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Seed Global Categories
const seedCategories = async () => {
  const count = await prisma.category.count();
  if (count === 0) {
    await prisma.category.createMany({
      data: [
        { name: 'Trabalho', color: '#EF4444' }, // Red
        { name: 'Estudos', color: '#3B82F6' }, // Blue
        { name: 'Pessoal', color: '#10B981' }, // Green
        { name: 'Casa', color: '#F59E0B' }     // Amber
      ]
    });
  }
};
seedCategories();

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, avatarUrl } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email já cadastrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: passwordHash, avatarUrl }
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Credenciais inválidas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// Dashboard Metrics
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const totalTasks = await prisma.task.count({ where: { userId: req.userId } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedToday = await prisma.task.count({
      where: { userId: req.userId, status: 'DONE', updatedAt: { gte: today } }
    });

    const overdueTasks = await prisma.task.count({
      where: { userId: req.userId, status: { in: ['TODO', 'DOING'] }, dueDate: { lt: new Date() } }
    });

    // Upcoming Tasks (Next 5)
    const upcomingTasks = await prisma.task.findMany({
      where: { userId: req.userId, status: { in: ['TODO', 'DOING'] }, dueDate: { gte: new Date() } },
      include: { category: true },
      orderBy: { dueDate: 'asc' },
      take: 5
    });

    // Last 7 Days Metrics
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const count = await prisma.task.count({
        where: {
          userId: req.userId,
          status: 'DONE',
          updatedAt: { gte: date, lt: nextDate }
        }
      });

      last7Days.push({
        date: date.toISOString(),
        count
      });
    }

    res.json({ 
      total: totalTasks, 
      completedToday, 
      overdue: overdueTasks,
      upcomingTasks,
      last7Days
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

// Tasks
app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId },
      include: { category: true, tags: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  const { title, description, dueDate, priority, status, categoryId, tags } = req.body;
  try {
    // Handle tags creation
    const tagConnectOrCreate = [];
    if (tags && Array.isArray(tags)) {
      for (const tagName of tags) {
        tagConnectOrCreate.push({
          where: { name_userId: { name: tagName, userId: req.userId } },
          create: { name: tagName, userId: req.userId }
        });
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'MEDIUM',
        status: status || 'PENDING',
        categoryId,
        userId: req.userId,
        tags: {
          connectOrCreate: tagConnectOrCreate
        }
      },
      include: { category: true, tags: true }
    });
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate, priority, status, categoryId } = req.body;
  try {
    const task = await prisma.task.update({
      where: { id, userId: req.userId },
      data: { title, description, dueDate: dueDate ? new Date(dueDate) : null, priority, status, categoryId },
      include: { category: true, tags: true }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.task.delete({ where: { id, userId: req.userId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar tarefa' });
  }
});

// Categories
app.get('/api/categories', authMiddleware, async (req, res) => {
  const categories = await prisma.category.findMany();
  res.json(categories);
});

// User's Tags
app.get('/api/tags', authMiddleware, async (req, res) => {
  const tags = await prisma.tag.findMany({ where: { userId: req.userId } });
  res.json(tags);
});

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});
