import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Check,
  Circle,
  DollarSign,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import AIAssistant from "@/components/AIAssistant";

interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  price_per_unit: number;
  category: string | null;
  completed: boolean;
}

interface GroceryList {
  id: string;
  name: string;
  budget: number;
  shopping_date: string | null;
}

const ListDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState<GroceryList | null>(null);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");

  useEffect(() => {
    if (id) {
      fetchListAndItems();
    }
  }, [id]);

  const fetchListAndItems = async () => {
    try {
      const { data: listData, error: listError } = await supabase
        .from("grocery_lists")
        .select("*")
        .eq("id", id)
        .single();

      if (listError) throw listError;
      setList(listData);

      const { data: itemsData, error: itemsError } = await supabase
        .from("grocery_items")
        .select("*")
        .eq("list_id", id)
        .order("position");

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load list");
      navigate("/lists");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      const { error } = await supabase.from("grocery_items").insert({
        list_id: id,
        name: newItemName,
        quantity: parseFloat(newItemQuantity),
        price_per_unit: newItemPrice ? parseFloat(newItemPrice) : 0,
        category: newItemCategory || null,
        position: items.length,
      });

      if (error) throw error;

      toast.success("Item added!");
      setDialogOpen(false);
      setNewItemName("");
      setNewItemQuantity("1");
      setNewItemPrice("");
      setNewItemCategory("");
      fetchListAndItems();
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to add item");
    }
  };

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("grocery_items")
        .update({ completed: !completed })
        .eq("id", itemId);

      if (error) throw error;
      fetchListAndItems();
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("grocery_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      toast.success("Item deleted");
      fetchListAndItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!list) {
    return <div>List not found</div>;
  }

  const totalCost = items.reduce(
    (sum, item) => sum + item.quantity * item.price_per_unit,
    0
  );
  const completedCount = items.filter((item) => item.completed).length;
  const isOverBudget = list.budget > 0 && totalCost > list.budget;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{list.name}</h1>
          {list.shopping_date && (
            <p className="text-muted-foreground mt-1">
              Shopping date: {new Date(list.shopping_date).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button onClick={() => navigate("/lists")} variant="outline">
          Back to Lists
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">${totalCost.toFixed(2)}</span>
              {list.budget > 0 && (
                <span className="text-muted-foreground">/ ${list.budget.toFixed(2)}</span>
              )}
            </div>
            {isOverBudget && (
              <div className="flex items-center gap-1 text-destructive text-sm mt-2">
                <AlertCircle className="h-4 w-4" />
                Over budget by ${(totalCost - list.budget).toFixed(2)}!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {completedCount} / {items.length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">items completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={isOverBudget ? "destructive" : "default"} className="text-lg">
              {list.budget > 0
                ? isOverBudget
                  ? "Over Budget"
                  : "Within Budget"
                : "No Budget Set"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <AIAssistant listId={id!} onItemsGenerated={fetchListAndItems} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Items ({items.length})</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Item</DialogTitle>
                  <DialogDescription>Add an item to your grocery list</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemName">Item Name</Label>
                    <Input
                      id="itemName"
                      placeholder="Milk, Bread, etc."
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price per Unit</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category (optional)</Label>
                    <Input
                      id="category"
                      placeholder="Produce, Dairy, etc."
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddItem} disabled={!newItemName}>
                    Add Item
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items yet. Add your first item or use AI to generate a list!
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors"
                >
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => handleToggleItem(item.id, item.completed)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                          item.completed ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.category && (
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Qty: {item.quantity} × ${item.price_per_unit.toFixed(2)} = $
                      {(item.quantity * item.price_per_unit).toFixed(2)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ListDetail;