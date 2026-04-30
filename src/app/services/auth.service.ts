import { Injectable, signal, inject } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from '@angular/fire/auth';
import { authState } from '@angular/fire/auth';

export type LoginProvider = 'email' | 'google';

export interface AccessInfo {
  date: string;
  provider: LoginProvider;
  email: string | null;
  userAgent: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth); // ✅ AQUI está a correção principal

  usuario = signal<User | null>(null);
  carregando = signal(true);
  erro = signal<string | null>(null);
  ultimoAcesso = signal<AccessInfo | null>(null);
  isAuthenticated = signal(false);

  private accessStorageKey = 'ultimo_acesso';

  constructor() {
    this.carregarUltimoAcesso();

    authState(this.auth).subscribe((user) => {
      this.usuario.set(user);
      this.isAuthenticated.set(!!user);
      this.carregando.set(false);
    });
  }

  async loginComEmailSenha(email: string, senha: string): Promise<User | null> {
    this.erro.set(null);

    if (!email || !senha) {
      this.erro.set('Informe email e senha.');
      this.isAuthenticated.set(false);
      return null;
    }

    try {
      const credencial = await signInWithEmailAndPassword(this.auth, email, senha);

      this.usuario.set(credencial.user);
      this.isAuthenticated.set(true);
      this.registrarAcesso('email', credencial.user.email);

      return credencial.user;
    } catch (error: unknown) {
      console.error('Erro Firebase Auth:', error);

      this.erro.set('Não foi possível entrar. Verifique email e senha.');
      this.isAuthenticated.set(false);
      return null;
    }
  }

  async loginComGoogle(): Promise<User | null> {
    this.erro.set(null);

    try {
      const provider = new GoogleAuthProvider();
      const credencial = await signInWithPopup(this.auth, provider);

      this.usuario.set(credencial.user);
      this.isAuthenticated.set(true);
      this.registrarAcesso('google', credencial.user.email);

      return credencial.user;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      // Se não quiser mostrar detalhe técnico, não coloque message aqui
      // this.erro.set('Não foi possível entrar. Verifique email e senha.');

      this.erro.set(`Não foi possível entrar. (${message})`);
      this.isAuthenticated.set(false);
      return null;
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.usuario.set(null);
    this.isAuthenticated.set(false);
  }

  estaLogado(): boolean {
    return this.isAuthenticated();
  }

  async getToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    return user ? user.getIdToken() : null;
  }

  private carregarUltimoAcesso() {
    const acessoSalvo = localStorage.getItem(this.accessStorageKey);

    if (!acessoSalvo) return;

    try {
      this.ultimoAcesso.set(JSON.parse(acessoSalvo));
    } catch {
      localStorage.removeItem(this.accessStorageKey);
    }
  }

  private registrarAcesso(provider: LoginProvider, email: string | null) {
    const acesso: AccessInfo = {
      date: new Date().toISOString(),
      provider,
      email,
      userAgent: navigator.userAgent,
    };

    this.ultimoAcesso.set(acesso);
    localStorage.setItem(this.accessStorageKey, JSON.stringify(acesso));
  }
}
