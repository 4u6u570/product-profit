import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CalculatorPage from './Calculator';
import { useAuth } from '@/hooks/useAuth';
import { ActivityFooter } from '@/components/ActivityFooter';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <CalculatorPage />
      <ActivityFooter />
    </>
  );
};

export default Index;
