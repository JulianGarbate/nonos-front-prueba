"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  login as loginRequest,
  loginWithGoogle as loginWithGoogleRequest,
  logoutRequest,
  me as meRequest,
  RolUsuario,
  Usuario,
} from "./api";

interface AuthContextValue {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Usuario>;
  loginWithGoogle: (idToken: string, rol?: RolUsuario) => Promise<Usuario>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function homeForRol(rol: RolUsuario) {
  return rol === "ADULTO_MAYOR" ? "/adulto-mayor" : "/familiar";
}

const TOKEN = "nonos_token";
const REFRESH = "nonos_refresh_token";

function guardarSesion(token: string, refreshToken: string) {
  window.localStorage.setItem(TOKEN, token);
  window.localStorage.setItem(REFRESH, refreshToken);
}
function limpiarSesion() {
  window.localStorage.removeItem(TOKEN);
  window.localStorage.removeItem(REFRESH);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!window.localStorage.getItem(TOKEN) && !window.localStorage.getItem(REFRESH)) {
      setLoading(false);
      return;
    }
    meRequest()
      .then(setUser)
      .catch(limpiarSesion)
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    const refreshToken = window.localStorage.getItem(REFRESH);
    if (refreshToken) logoutRequest(refreshToken).catch(() => {});
    limpiarSesion();
    setUser(null);
    router.push("/login");
  }, [router]);

  useEffect(() => {
    const onExpired = () => {
      limpiarSesion();
      setUser(null);
      router.push("/login");
    };
    window.addEventListener("nonos:sesion-expirada", onExpired);
    return () => window.removeEventListener("nonos:sesion-expirada", onExpired);
  }, [router]);

  async function login(email: string, password: string) {
    const { token, refreshToken } = await loginRequest(email, password);
    guardarSesion(token, refreshToken);
    const usuario = await meRequest();
    setUser(usuario);
    return usuario;
  }

  async function loginWithGoogle(idToken: string, rol?: RolUsuario) {
    const { token, refreshToken } = await loginWithGoogleRequest(idToken, rol);
    guardarSesion(token, refreshToken);
    const usuario = await meRequest();
    setUser(usuario);
    return usuario;
  }

  async function refreshUser() {
    setUser(await meRequest());
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

/**
 * Protege una pantalla: sin sesión manda a /login; con sesión de otro rol,
 * manda al home que le corresponde. Devuelve el usuario solo cuando puede
 * renderizarse.
 */
export function useRequireAuth(rol?: RolUsuario) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (rol && user.rol !== rol) router.replace(homeForRol(user.rol));
  }, [loading, user, rol, router]);

  const ok = !loading && !!user && (!rol || user.rol === rol);
  return { user: ok ? user : null, ready: ok };
}
