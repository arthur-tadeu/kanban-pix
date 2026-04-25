import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { CheckCircle2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { login, register, user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', avatarUrl: '' });
  const [error, setError] = useState('');

  if (user) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.name, formData.email, formData.password, formData.avatarUrl);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ocorreu um erro');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-primary"></div>
        
        <div className="flex justify-center mb-8">
          <div className="bg-primary/10 p-3 rounded-full">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-6">
          {isLogin ? 'Bem-vindo de volta' : 'Criar nova conta'}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-md mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Nome completo</label>
                <input required type="text" className="w-full bg-background border border-input rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL do Avatar (Opcional)</label>
                <input type="url" placeholder="https://..." className="w-full bg-background border border-input rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.avatarUrl} onChange={e => setFormData({...formData, avatarUrl: e.target.value})} />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input required type="email" className="w-full bg-background border border-input rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input required type="password" minLength={6} className="w-full bg-background border border-input rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <button type="submit" className="w-full py-2.5 mt-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors">
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
          <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-primary hover:underline focus:outline-none">
            {isLogin ? 'Criar conta' : 'Fazer login'}
          </button>
        </div>
      </div>
    </div>
  );
}
