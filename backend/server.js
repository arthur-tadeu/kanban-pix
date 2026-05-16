const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'banco-josue'
  });
}

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';

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

// Seed Global Categories (Helper)
const seedCategories = async () => {
  const categoriesRef = db.collection('categories');
  const snapshot = await categoriesRef.get();
  if (snapshot.empty) {
    const categories = [
      { name: 'Trabalho', color: '#EF4444' },
      { name: 'Estudos', color: '#3B82F6' },
      { name: 'Pessoal', color: '#10B981' },
      { name: 'Casa', color: '#F59E0B' }
    ];
    for (const cat of categories) {
      await categoriesRef.add(cat);
    }
  }
};
seedCategories().catch(console.error);

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, avatarUrl } = req.body;
  try {
    const userRef = db.collection('users').where('email', '==', email);
    const existing = await userRef.get();
    if (!existing.empty) return res.status(400).json({ error: 'Email já cadastrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      name,
      email,
      password: passwordHash,
      avatarUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('users').add(newUser);
    
    const token = jwt.sign({ userId: docRef.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: docRef.id, name, email, avatarUrl } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRef = db.collection('users').where('email', '==', email);
    const snapshot = await userRef.get();
    if (snapshot.empty) return res.status(400).json({ error: 'Credenciais inválidas' });

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ userId: userDoc.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: userDoc.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Usuário não encontrado' });
    const user = userDoc.data();
    res.json({ id: userDoc.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// Dashboard Metrics
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const tasksRef = db.collection('tasks').where('userId', '==', req.userId);
    const allTasksSnapshot = await tasksRef.get();
    const totalTasks = allTasksSnapshot.size;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedTodaySnapshot = await db.collection('tasks')
      .where('userId', '==', req.userId)
      .where('status', '==', 'DONE')
      .where('updatedAt', '>=', admin.firestore.Timestamp.fromDate(today))
      .get();
    const completedToday = completedTodaySnapshot.size;

    const overdueSnapshot = await db.collection('tasks')
      .where('userId', '==', req.userId)
      .where('status', 'in', ['TODO', 'DOING'])
      .where('dueDate', '<', admin.firestore.Timestamp.now())
      .get();
    const overdueTasks = overdueSnapshot.size;

    // Upcoming Tasks (Next 5)
    const upcomingSnapshot = await db.collection('tasks')
      .where('userId', '==', req.userId)
      .where('status', 'in', ['TODO', 'DOING'])
      .where('dueDate', '>=', admin.firestore.Timestamp.now())
      .orderBy('dueDate', 'asc')
      .limit(5)
      .get();
    
    const upcomingTasks = upcomingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Last 7 Days Metrics
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const countSnapshot = await db.collection('tasks')
        .where('userId', '==', req.userId)
        .where('status', '==', 'DONE')
        .where('updatedAt', '>=', admin.firestore.Timestamp.fromDate(date))
        .where('updatedAt', '<', admin.firestore.Timestamp.fromDate(nextDate))
        .get();

      last7Days.push({
        date: date.toISOString(),
        count: countSnapshot.size
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
    const tasksSnapshot = await db.collection('tasks')
      .where('userId', '==', req.userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  const { title, description, dueDate, priority, status, categoryId, tags } = req.body;
  try {
    const newTask = {
      title,
      description,
      dueDate: dueDate ? admin.firestore.Timestamp.fromDate(new Date(dueDate)) : null,
      priority: priority || 'MEDIUM',
      status: status || 'TODO',
      categoryId,
      userId: req.userId,
      tags: tags || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('tasks').add(newTask);
    res.json({ id: docRef.id, ...newTask });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate, priority, status, categoryId } = req.body;
  try {
    const updateData = {
      title,
      description,
      dueDate: dueDate ? admin.firestore.Timestamp.fromDate(new Date(dueDate)) : null,
      priority,
      status,
      categoryId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('tasks').doc(id).update(updateData);
    res.json({ id, ...updateData });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection('tasks').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar tarefa' });
  }
});

// Categories
app.get('/api/categories', authMiddleware, async (req, res) => {
  try {
    const snapshot = await db.collection('categories').get();
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// User's Tags
app.get('/api/tags', authMiddleware, async (req, res) => {
  try {
    const snapshot = await db.collection('tags').where('userId', '==', req.userId).get();
    const tags = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar tags' });
  }
});

// Export for Vercel
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
  });
}
