import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import BiometricGate from "@/components/BiometricGate";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading, biometricVerified } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm font-mono text-muted-foreground">Loading secure workspace...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (!biometricVerified) {
    return <BiometricGate />;
  }

  return <Dashboard />;
};

export default Index;
