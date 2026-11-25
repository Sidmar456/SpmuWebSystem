import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // undefined = still checking the session, null = logged out
    const [user, setUser] = useState(undefined);

    useEffect(() => {
        api.get('/me')
            .then((res) => setUser(res.data.user))
            .catch(() => setUser(null));
    }, []);

    const login = useCallback(async (email, password) => {
        const res = await api.post('/login', { email, password });
        setUser(res.data.user);
        return res.data.user;
    }, []);

    const logout = useCallback(async () => {
        await api.post('/logout');
        setUser(null);
    }, []);

    return <AuthContext.Provider value={{ user, setUser, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const auth = useContext(AuthContext);
    return { ...auth, isAdmin: auth.user?.role === 'admin' };
}
