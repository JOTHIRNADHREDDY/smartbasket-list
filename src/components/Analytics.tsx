import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Award } from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";

interface AnalyticsProps {
  userId: string;
}

const Analytics = ({ userId }: AnalyticsProps) => {
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalLists: 0,
    totalItems: 0,
    avgListCost: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [userId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch all lists for user
      const { data: lists } = await supabase
        .from("grocery_lists")
        .select("id, budget")
        .eq("user_id", userId);

      if (!lists) return;

      // Fetch all items for these lists
      const listIds = lists.map((l) => l.id);
      const { data: items } = await supabase
        .from("grocery_items")
        .select("*")
        .in("list_id", listIds);

      if (!items) return;

      // Calculate total spent - filter out items with unreasonably high prices (> 10000)
      // This handles legacy data issues from when pricing wasn't working correctly
      const totalSpent = items.reduce(
        (sum, item) => {
          // Skip items with prices above 10000 (likely data errors)
          if (item.price_per_unit > 10000) {
            console.warn('Skipping item with unreasonably high price:', item.name, item.price_per_unit);
            return sum;
          }
          return sum + item.price_per_unit;
        },
        0
      );

      setStats({
        totalSpent,
        totalLists: lists.length,
        totalItems: items.length,
        avgListCost: lists.length > 0 ? totalSpent / lists.length : 0,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Your Grocery Analytics 📊</h2>
        <p className="text-muted-foreground">Track your shopping habits and savings!</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatPrice(stats.totalSpent)}</div>
            <p className="text-xs text-muted-foreground mt-1">All time spending</p>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lists</CardTitle>
            <ShoppingBag className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.totalLists}</div>
            <p className="text-xs text-muted-foreground mt-1">Lists created</p>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-gradient-to-br from-success/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">Items purchased</p>
          </CardContent>
        </Card>

        <Card className="border-info/20 bg-gradient-to-br from-info/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per List</CardTitle>
            <Award className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{formatPrice(stats.avgListCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">Average spending</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-success/10 border-primary/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold text-lg">Great job! 🎉</h3>
              <p className="text-sm text-muted-foreground">
                You've been staying organized with your grocery shopping! Keep it up! 💪
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
