import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { CheckCircle2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { login, register, loginWithGoogle, user } = useAuth();
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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Ou continue com</span>
          </div>
        </div>

        <button 
          onClick={async () => {
            setError('');
            try {
              await loginWithGoogle();
            } catch (err) {
              console.error("Erro detalhado do Google Login:", err);
              let msg = 'Erro ao autenticar com Google';
              if (err.code) {
                // Erro do Firebase
                msg = `Erro Firebase (${err.code}): ${err.message}`;
              } else if (err.response) {
                // Erro do Backend
                msg = err.response.data?.details || err.response.data?.error || `Erro Backend (${err.response.status})`;
              } else if (err.request) {
                // Erro de rede
                msg = 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.';
              }
              setError(msg);
            }
          }}
          className="w-full py-2.5 flex items-center justify-center gap-2 border border-border bg-card text-card-foreground rounded-md hover:bg-muted/50 transition-colors"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

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
