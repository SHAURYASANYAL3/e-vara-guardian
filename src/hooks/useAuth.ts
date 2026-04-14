import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthUser {
  id: string;
  email: string;
}

export interface ProfileRecord {
  displayName: string;
  username: string;
  socialLink: string;
  keywords: string;
}

export interface SuspiciousAlert {
  id: string;
  alertType: string;
  message: string;
  confidence: number;
  acknowledgedByUser: boolean;
  acknowledgedByAdmin: boolean;
  createdAt: string;
}

const biometricFlagKey = (userId: string) => `evara-biometric-verified:${userId}`;

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [alerts, setAlerts] = useState<SuspiciousAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);
  const [biometricVerified, setBiometricVerifiedState] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const syncSession = useCallback((sessionUser: { id: string; email?: string | null } | null) => {
    if (!sessionUser) {
      setUser(null);
      setProfile(null);
      setAlerts([]);
      setIsBiometricEnrolled(false);
      setBiometricVerifiedState(false);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setUser({ id: sessionUser.id, email: sessionUser.email ?? "" });
    setBiometricVerifiedState(sessionStorage.getItem(biometricFlagKey(sessionUser.id)) === "true");
    setLoading(false);
  }, []);

  const refreshState = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase.functions.invoke("biometric-me", { body: {} });
    if (error) throw error;

    setProfile(data?.profile ? {
      displayName: data.profile.display_name ?? "",
      username: data.profile.username ?? "",
      socialLink: data.profile.social_link ?? "",
      keywords: data.profile.keywords ?? "",
    } : null);

    setAlerts((data?.alerts ?? []).map((alert: any) => ({
      id: String(alert.id),
      alertType: String(alert.alert_type),
      message: String(alert.message),
      confidence: Number(alert.confidence ?? 0),
      acknowledgedByUser: Boolean(alert.acknowledged_by_user),
      acknowledgedByAdmin: Boolean(alert.acknowledged_by_admin),
      createdAt: String(alert.created_at),
    })));

    setIsBiometricEnrolled(Boolean(data?.isEnrolled));
    setIsAdmin(Boolean(data?.isAdmin));
  }, [user]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      syncSession(data.session?.user ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [syncSession]);

  useEffect(() => {
    if (!user) return;
    void refreshState();
  }, [user, refreshState]);

  const register = useCallback(async (payload: {
    email: string;
    password: string;
    confirmPassword: string;
    displayName: string;
  }) => {
    if (payload.password !== payload.confirmPassword) return { error: "Passwords do not match", hasSession: false };
    if (payload.password.length < 6) return { error: "Password must be at least 6 characters", hasSession: false };

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: { display_name: payload.displayName },
      },
    });

    return {
      error: error?.message ?? null,
      hasSession: Boolean(data.session),
      needsEmailVerification: Boolean(data.user && !data.session),
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return "Email is required";

    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) return error.message;

    const [{ data: userData }, { data: sessionData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession(),
    ]);

    if (!sessionData.session) {
      return "Sign-in completed but no active session was found. Please try again.";
    }

    if (userData.user) {
      sessionStorage.removeItem(biometricFlagKey(userData.user.id));
      setBiometricVerifiedState(false);
      setUser({ id: userData.user.id, email: userData.user.email ?? "" });
    }

    return null;
  }, []);

  const logout = useCallback(async () => {
    if (user) {
      sessionStorage.removeItem(biometricFlagKey(user.id));
    }
    await supabase.auth.signOut();
  }, [user]);

  const saveProfile = useCallback(async (nextProfile: ProfileRecord) => {
    const { error } = await supabase.functions.invoke("biometric-profile", {
      body: {
        displayName: nextProfile.displayName,
        username: nextProfile.username,
        socialLink: nextProfile.socialLink,
        keywords: nextProfile.keywords,
      },
    });

    if (error) return error.message;
    await refreshState();
    return null;
  }, [refreshState]);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    const { error } = await supabase.functions.invoke("biometric-ack-alert", {
      body: { alertId },
    });

    if (error) return error.message;
    await refreshState();
    return null;
  }, [refreshState]);

  const setBiometricVerified = useCallback((verified: boolean) => {
    if (user) {
      if (verified) {
        sessionStorage.setItem(biometricFlagKey(user.id), "true");
      } else {
        sessionStorage.removeItem(biometricFlagKey(user.id));
      }
    }
    setBiometricVerifiedState(verified);
  }, [user]);

  const hasProfile = useMemo(() => Boolean(profile?.displayName || profile?.username), [profile]);

  return {
    user,
    profile,
    alerts,
    loading,
    isAdmin,
    hasProfile,
    biometricVerified,
    isBiometricEnrolled,
    register,
    login,
    logout,
    refreshState,
    saveProfile,
    acknowledgeAlert,
    setBiometricVerified,
  };
}
