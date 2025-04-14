"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
    userId: string;
    username: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            try {
                const decoded = jwtDecode<User>(storedToken);
                setUser(decoded);
                setToken(storedToken);
            } catch (error) {
                console.error('Invalid token:', error);
                localStorage.removeItem('token');
            }
        }
    }, []);

    const login = (newToken: string) => {
        try {
            const decoded = jwtDecode<User>(newToken);
            setUser(decoded);
            setToken(newToken);
            localStorage.setItem('token', newToken);
        } catch (error) {
            console.error('Invalid token on login:', error);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('currentUsername');
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};