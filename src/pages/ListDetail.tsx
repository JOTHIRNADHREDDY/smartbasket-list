import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Check,
  Circle,
  IndianRupee,
  Sparkles,
  AlertCircle,
  GripVertical,
  Pencil,
  Apple,
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
import LovaChat from "@/components/LovaChat";
import { formatPrice } from "@/lib/formatPrice";

interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  category: string | null;
  completed: boolean;
  added_by: string | null;
  added_by_profile?: {
    full_name: string;
  } | null;
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
  onEdit,
  onShowNutrition
}: { 
  item: GroceryItem; 
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (item: GroceryItem) => void;
  onShowNutrition: (itemName: string) => void;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <Checkbox
        checked={item.completed}
        onCheckedChange={() => onToggle(item.id, item.completed)}
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
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
          Qty: {item.quantity} {item.unit} | Price: {formatPrice(item.price_per_unit)}
        </div>
        {item.added_by_profile?.full_name && (
          <div className="text-xs text-muted-foreground mt-0.5">
            Added by: {item.added_by_profile.full_name}
          </div>
        )}
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onShowNutrition(item.name)}
          title="View nutrition info"
        >
          <Apple className="h-4 w-4 text-green-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(item)}
          title="Edit item"
        >
          <Pencil className="h-4 w-4 text-blue-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(item.id)}
          title="Delete item"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("pcs");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [nutritionInfo, setNutritionInfo] = useState<string>("");
  const [nutritionDialogOpen, setNutritionDialogOpen] = useState(false);
  const [editBudget, setEditBudget] = useState("");
  const [editShoppingDate, setEditShoppingDate] = useState("");
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
        .order("completed", { ascending: true })
        .order("position");

      if (itemsError) throw itemsError;
      
      // Fetch profile information for items with added_by
      const itemsWithProfiles = await Promise.all(
        (itemsData || []).map(async (item) => {
          if (item.added_by) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", item.added_by)
              .single();
            
            return { ...item, added_by_profile: profile };
          }
          return { ...item, added_by_profile: null };
        })
      );
      
      setItems(itemsWithProfiles as GroceryItem[]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load list");
      navigate("/lists");
    } finally {
      setLoading(false);
    }
  };

  const fetchItemPrice = async (itemName: string, quantity: number, unit: string) => {
    if (!itemName.trim()) {
      toast.error("Please enter an item name first");
      return;
    }
    
    setFetchingPrice(true);
    try {
      console.log("Fetching price for:", itemName, quantity, unit);
      const { data, error } = await supabase.functions.invoke('fetch-item-price', {
        body: { itemName, quantity, unit }
      });

      console.log("Price response:", data, error);

      if (error) {
        console.error("Function error:", error);
        throw error;
      }

      if (data?.price) {
        setNewItemPrice(data.price.toString());
        toast.success(`Price: ${formatPrice(data.price)}`, {
          description: data.source === 'estimated' ? 'Estimated price' : 'From database'
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
    if (!newItemName) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const priceValue = parseFloat(newItemPrice) || 0;
      
      console.log("Adding item:", {
        name: newItemName,
        quantity: parseFloat(newItemQuantity) || 1,
        unit: newItemUnit,
        price_per_unit: priceValue,
      });

      const { error } = await supabase.from("grocery_items").insert({
        list_id: id,
        name: newItemName,
        quantity: parseFloat(newItemQuantity) || 1,
        unit: newItemUnit,
        price_per_unit: priceValue,
        category: newItemCategory || null,
        position: items.length,
        added_by: user?.id,
      });

      if (error) throw error;

      toast.success("Item added! 🎉");
      setDialogOpen(false);
      setNewItemName("");
      setNewItemQuantity("1");
      setNewItemUnit("pcs");
      setNewItemPrice("");
      setNewItemCategory("");
      fetchListAndItems();
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to add item");
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || !newItemName) return;

    try {
      const priceValue = parseFloat(newItemPrice) || 0;
      
      console.log("Updating item:", {
        name: newItemName,
        quantity: parseFloat(newItemQuantity) || 1,
        unit: newItemUnit,
        price_per_unit: priceValue,
      });

      const { error } = await supabase
        .from("grocery_items")
        .update({
          name: newItemName,
          quantity: parseFloat(newItemQuantity) || 1,
          unit: newItemUnit,
          price_per_unit: priceValue,
          category: newItemCategory || null,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      toast.success("Item updated! ✨");
      setEditItemDialogOpen(false);
      setEditingItem(null);
      setNewItemName("");
      setNewItemQuantity("1");
      setNewItemUnit("pcs");
      setNewItemPrice("");
      setNewItemCategory("");
      fetchListAndItems();
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item");
    }
  };

  const openEditDialog = (item: GroceryItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemQuantity(item.quantity.toString());
    setNewItemUnit(item.unit);
    setNewItemPrice(item.price_per_unit.toString());
    setNewItemCategory(item.category || "");
    setEditItemDialogOpen(true);
  };

  const fetchNutritionInfo = async (itemName: string) => {
    setNutritionDialogOpen(true);
    setNutritionInfo("Loading nutrition info... 🔍");

    try {
      const { data, error } = await supabase.functions.invoke("ai-grocery-assistant", {
        body: {
          prompt: `Tell me about the nutrition information for ${itemName}`,
          type: "nutrition",
        },
      });

      if (error) throw error;
      setNutritionInfo(data.content);
    } catch (error) {
      console.error("Error fetching nutrition info:", error);
      setNutritionInfo("Oops! 😅 Couldn't fetch nutrition info. Please try again.");
    }
  };

  const handleUpdateList = async () => {
    try {
      const { error } = await supabase
        .from("grocery_lists")
        .update({
          budget: editBudget ? parseFloat(editBudget) : 0,
          shopping_date: editShoppingDate || null,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("List updated!");
      setEditDialogOpen(false);
      fetchListAndItems();
    } catch (error) {
      console.error("Error updating list:", error);
      toast.error("Failed to update list");
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

  // Calculate total cost - filter out items with unreasonably high prices (> 10000)
  // This handles legacy data issues from when pricing wasn't working correctly
  const totalCost = items.reduce(
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">{list.name}</h1>
          {list.shopping_date && (
            <p className="text-muted-foreground mt-1">
              Shopping date: {new Date(list.shopping_date).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                onClick={() => {
                  setEditBudget(list.budget?.toString() || "");
                  setEditShoppingDate(list.shopping_date || "");
                }}
              >
                Edit List
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit List Details</DialogTitle>
                <DialogDescription>Update your list budget and shopping date</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editBudget">Total Budget (₹)</Label>
                  <Input
                    id="editBudget"
                    type="number"
                    step="0.01"
                    placeholder="5000.00"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editShoppingDate">Shopping Date</Label>
                  <Input
                    id="editShoppingDate"
                    type="date"
                    value={editShoppingDate}
                    onChange={(e) => setEditShoppingDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUpdateList}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => navigate("/lists")} variant="outline">
            Back to Lists
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div
              className="flex items-baseline gap-2"
              animate={isOverBudget ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              <span className={`text-3xl font-bold ${isOverBudget ? "text-destructive" : ""}`}>
                {formatPrice(totalCost)}
              </span>
              {list.budget > 0 && (
                <span className="text-muted-foreground">/ {formatPrice(list.budget)}</span>
              )}
            </motion.div>
            {isOverBudget && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1 text-destructive text-sm mt-2"
              >
                <AlertCircle className="h-4 w-4" />
                Oops! Over budget by {formatPrice(totalCost - list.budget)}! 😅
              </motion.div>
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
                  <div className="grid grid-cols-3 gap-4">
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
                      <Label htmlFor="unit">Unit</Label>
                      <Select value={newItemUnit} onValueChange={setNewItemUnit}>
                        <SelectTrigger id="unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                          <SelectItem value="kg">Kilogram (kg)</SelectItem>
                          <SelectItem value="gm">Gram (gm)</SelectItem>
                          <SelectItem value="l">Liter (l)</SelectItem>
                          <SelectItem value="ml">Milliliter (ml)</SelectItem>
                          <SelectItem value="dozen">Dozen</SelectItem>
                          <SelectItem value="pack">Pack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
              <div className="space-y-2">
                <Label htmlFor="price">Total Price (₹)</Label>
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
                    onClick={() => fetchItemPrice(newItemName, parseFloat(newItemQuantity) || 1, newItemUnit)}
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

            {/* Edit Item Dialog */}
            <Dialog open={editItemDialogOpen} onOpenChange={setEditItemDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Item Name</Label>
                    <Input
                      id="edit-name"
                      placeholder="e.g., Tomatoes"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-quantity">Quantity</Label>
                      <Input
                        id="edit-quantity"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-unit">Unit</Label>
                      <Select value={newItemUnit} onValueChange={setNewItemUnit}>
                        <SelectTrigger id="edit-unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                          <SelectItem value="kg">Kilogram (kg)</SelectItem>
                          <SelectItem value="gm">Gram (gm)</SelectItem>
                          <SelectItem value="l">Liter (l)</SelectItem>
                          <SelectItem value="ml">Milliliter (ml)</SelectItem>
                          <SelectItem value="dozen">Dozen</SelectItem>
                          <SelectItem value="pack">Pack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-price">Total Price (₹)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="edit-price"
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
                          onClick={() => fetchItemPrice(newItemName, parseFloat(newItemQuantity) || 1, newItemUnit)}
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
                    <Label htmlFor="edit-category">Category (optional)</Label>
                    <Input
                      id="edit-category"
                      placeholder="Produce, Dairy, etc."
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleEditItem} disabled={!newItemName}>
                    Update Item
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Nutrition Info Dialog */}
            <Dialog open={nutritionDialogOpen} onOpenChange={setNutritionDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nutrition Information</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm whitespace-pre-wrap">{nutritionInfo}</p>
                </div>
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
                      onEdit={openEditDialog}
                      onShowNutrition={fetchNutritionInfo}
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