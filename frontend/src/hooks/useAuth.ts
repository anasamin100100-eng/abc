import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '@tanstack/react-router';

export const useAuthRedirect = () => {
  const { user, token, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate({ from: '/login' });

  useEffect(() => {
    if (isAuthenticated && (window.location.pathname === '/login' || window.location.pathname === '/register')) {
      navigate({ to: '/dashboard' });
    }
  }, [isAuthenticated, navigate]);

  return { user, token, isAuthenticated, logout };
};

export const useRequireAuth = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, navigate]);

  return { isAuthenticated };
};
