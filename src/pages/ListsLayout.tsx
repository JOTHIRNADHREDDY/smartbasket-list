import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import { Skeleton } from "@/components/ui/skeleton";

const ListsLayout = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
        } else if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
          navigate("/auth");
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        // Clear invalid session
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        navigate("/auth");
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    }).catch(async (error) => {
      console.error("Session error:", error);
      await supabase.auth.signOut();
      navigate("/auth");
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex h-screen">
        <div className="w-64 border-r">
          <Skeleton className="h-full" />
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-full" />
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 lg:pt-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ListsLayout;