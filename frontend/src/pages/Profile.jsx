import React from 'react';
import { useAuth } from '../AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Meu Perfil</h1>
        <p className="text-muted-foreground text-lg">Gerencie sua conta e visualize suas informações.</p>
      </header>

      <div className="bg-card border border-border p-8 rounded-2xl shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start">
        <div className="flex-shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center text-primary border-4 border-background shadow-lg">
              <UserIcon size={48} />
            </div>
          )}
        </div>

        <div className="flex-1 text-center md:text-left space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          
          <div className="pt-4 border-t border-border inline-block md:block w-full">
            <button 
              onClick={logout}
              className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors px-6 py-2.5 rounded-md font-medium flex items-center gap-2 mx-auto md:mx-0"
            >
              <LogOut size={18} />
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
