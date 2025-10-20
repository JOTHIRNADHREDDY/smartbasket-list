import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Check,
  Circle,
  DollarSign,
  Sparkles,
  AlertCircle,
  GripVertical,
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatPrice } from "@/lib/formatPrice";
import BudgetBar from "@/components/BudgetBar";
import LovaChat from "@/components/LovaChat";

interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  price_per_unit: number;
  category: string | null;
  completed: boolean;
  purchased: boolean;
  unit: string;
}

interface GroceryList {
  id: string;
  name: string;
  budget: number;
  shopping_date: string | null;
}

// Sortable Item Component (must be outside to avoid hooks violation)
const SortableItem = ({ 
  item, 
  onToggle, 
  onDelete,
  onTogglePurchased
}: { 
  item: GroceryItem; 
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onTogglePurchased: (id: string, purchased: boolean) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const itemTotal = item.quantity * item.price_per_unit;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors ${
        item.purchased ? 'bg-muted/30' : ''
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-2">
        <Checkbox
          checked={item.completed}
          onCheckedChange={() => onToggle(item.id, item.completed)}
        />
        <Checkbox
          checked={item.purchased}
          onCheckedChange={() => onTogglePurchased(item.id, item.purchased)}
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`font-medium ${
              item.purchased ? "line-through text-muted-foreground" : ""
            }`}
          >
            {item.name}
          </span>
          {item.category && (
            <Badge variant="secondary" className="text-xs">
              {item.category}
            </Badge>
          )}
          {item.purchased && (
            <Badge variant="outline" className="text-xs">Purchased ✓</Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {item.quantity} {item.unit || 'pcs'} × {formatPrice(item.price_per_unit)} = {formatPrice(itemTotal)}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
};

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
  const [fetchingPrice, setFetchingPrice] = useState(false);

  // Initialize sensors at the top (before any returns)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const fetchItemPrice = async (itemName: string) => {
    if (!itemName.trim()) {
      toast.error("Please enter an item name first");
      return;
    }
    
    setFetchingPrice(true);
    try {
      console.log("Fetching price for:", itemName);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-item-price?item=${encodeURIComponent(itemName)}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          }
        }
      );

      const data = await response.json();
      console.log("Price response:", data);

      if (data?.unitPrice) {
        setNewItemPrice(data.unitPrice.toString());
        toast.success(`${formatPrice(data.unitPrice)} from ${data.source}`, {
          description: `${data.quantity} - ${data.updated}`
        });
      } else {
        toast.error("No price data received");
      }
    } catch (error) {
      console.error("Error fetching price:", error);
      toast.error("Failed to fetch price. Please enter manually.");
    } finally {
      setFetchingPrice(false);
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

  const handleTogglePurchased = async (itemId: string, purchased: boolean) => {
    try {
      const { error } = await supabase
        .from("grocery_items")
        .update({ purchased: !purchased })
        .eq("id", itemId);

      if (error) throw error;
      fetchListAndItems();
    } catch (error) {
      console.error("Error updating purchased status:", error);
      toast.error("Failed to update purchased status");
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      // Update positions in database
      try {
        const updates = newItems.map((item, index) =>
          supabase
            .from("grocery_items")
            .update({ position: index })
            .eq("id", item.id)
        );
        await Promise.all(updates);
        toast.success("Items reordered! 🎯");
      } catch (error) {
        console.error("Error updating positions:", error);
        toast.error("Failed to save new order");
        fetchListAndItems(); // Revert on error
      }
    }
  };

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

      <BudgetBar budget={list.budget} totalCost={totalCost} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPrice(totalCost)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {completedCount} of {items.length} items completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress:</span>
                <Badge>{items.length ? Math.round((completedCount / items.length) * 100) : 0}%</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg per item:</span>
                <span className="font-medium">{formatPrice(items.length ? totalCost / items.length : 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <LovaChat listId={id!} onItemsGenerated={fetchListAndItems} />

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
                <div className="flex gap-2">
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fetchItemPrice(newItemName)}
                    disabled={!newItemName || fetchingPrice}
                    size="sm"
                    className="shrink-0"
                  >
                    {fetchingPrice ? (
                      <Sparkles className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" />
                        Auto
                      </>
                    )}
                  </Button>
                </div>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-muted-foreground text-lg">Your cart is empty... for now! 😋</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Add Item" or chat with Lova to get started! 🩵
              </p>
            </motion.div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map((item) => (
                    <SortableItem 
                      key={item.id} 
                      item={item} 
                      onToggle={handleToggleItem}
                      onDelete={handleDeleteItem}
                      onTogglePurchased={handleTogglePurchased}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ListDetail;