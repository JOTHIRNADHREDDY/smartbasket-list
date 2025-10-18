import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, DollarSign, CheckCircle2, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalLists: number;
  totalItems: number;
  completedItems: number;
  totalBudget: number;
  totalSpent: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: lists } = await supabase
        .from("grocery_lists")
        .select("id, budget");

      const { data: items } = await supabase
        .from("grocery_items")
        .select("completed, quantity, price_per_unit");

      const totalLists = lists?.length || 0;
      const totalItems = items?.length || 0;
      const completedItems = items?.filter((item) => item.completed).length || 0;
      const totalBudget = lists?.reduce((sum, list) => sum + Number(list.budget || 0), 0) || 0;
      const totalSpent = items?.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.price_per_unit),
        0
      ) || 0;

      setStats({
        totalLists,
        totalItems,
        completedItems,
        totalBudget,
        totalSpent,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const completionRate = stats?.totalItems
    ? Math.round((stats.completedItems / stats.totalItems) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lists</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.totalLists || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active grocery lists</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.completedItems || 0} of {stats?.totalItems || 0} items done
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <TrendingUp className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              ${stats?.totalBudget.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all lists</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              ${stats?.totalSpent.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalBudget && stats.totalSpent > stats.totalBudget ? (
                <span className="text-destructive">Over budget!</span>
              ) : (
                "Within budget"
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;