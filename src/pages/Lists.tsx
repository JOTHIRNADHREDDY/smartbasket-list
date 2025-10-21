import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ListCard from "@/components/ListCard";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface GroceryList {
  id: string;
  name: string;
  budget: number;
  shopping_date: string | null;
  itemCount?: number;
  completedCount?: number;
  totalCost?: number;
}

const Lists = () => {
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListBudget, setNewListBudget] = useState("");
  const [newListDate, setNewListDate] = useState("");

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: listsData, error } = await supabase
        .from("grocery_lists")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const listsWithStats = await Promise.all(
        (listsData || []).map(async (list) => {
          const { data: items } = await supabase
            .from("grocery_items")
            .select("completed, quantity, price_per_unit")
            .eq("list_id", list.id);

          const itemCount = items?.length || 0;
          const completedCount = items?.filter((item) => item.completed).length || 0;
          const totalCost = items?.reduce(
            (sum, item) => sum + Number(item.price_per_unit),
            0
          ) || 0;

          return {
            ...list,
            itemCount,
            completedCount,
            totalCost,
          };
        })
      );

      setLists(listsWithStats);
    } catch (error) {
      console.error("Error fetching lists:", error);
      toast.error("Failed to fetch lists");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("grocery_lists").insert({
        user_id: user.id,
        name: newListName,
        budget: newListBudget ? parseFloat(newListBudget) : 0,
        shopping_date: newListDate || null,
      });

      if (error) throw error;

      toast.success("List created!");
      setDialogOpen(false);
      setNewListName("");
      setNewListBudget("");
      setNewListDate("");
      fetchLists();
    } catch (error) {
      console.error("Error creating list:", error);
      toast.error("Failed to create list");
    }
  };

  const handleDeleteList = async (id: string) => {
    try {
      const { error } = await supabase
        .from("grocery_lists")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("List deleted");
      fetchLists();
    } catch (error) {
      console.error("Error deleting list:", error);
      toast.error("Failed to delete list");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Grocery Lists</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New List
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New List</DialogTitle>
              <DialogDescription>
                Start planning your next shopping trip
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">List Name</Label>
                <Input
                  id="name"
                  placeholder="Weekly Groceries"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  placeholder="5000.00"
                  value={newListBudget}
                  onChange={(e) => setNewListBudget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Shopping Date (optional)</Label>
                <Input
                  id="date"
                  type="date"
                  value={newListDate}
                  onChange={(e) => setNewListDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateList} disabled={!newListName}>
                Create List
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No lists yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} onDelete={handleDeleteList} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Lists;