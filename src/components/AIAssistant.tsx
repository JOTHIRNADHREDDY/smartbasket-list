import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIAssistantProps {
  listId: string;
  onItemsGenerated: () => void;
}

const AIAssistant = ({ listId, onItemsGenerated }: AIAssistantProps) => {
  const [mealPrompt, setMealPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMealToList = async () => {
    if (!mealPrompt.trim()) {
      toast.error("Please describe a meal first");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-grocery-assistant", {
        body: {
          prompt: mealPrompt,
          type: "meal-to-list",
        },
      });

      if (error) throw error;

      const content = data.content;
      let items = [];

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          items = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Failed to parse AI response:", e);
        toast.error("AI returned unexpected format. Try again.");
        return;
      }

      const insertPromises = items.map((item: any, index: number) =>
        supabase.from("grocery_items").insert({
          list_id: listId,
          name: item.name,
          quantity: item.quantity || 1,
          price_per_unit: item.price_per_unit || 0,
          category: item.category || null,
          position: index,
        })
      );

      await Promise.all(insertPromises);

      toast.success(`Added ${items.length} items to your list!`);
      setMealPrompt("");
      onItemsGenerated();
    } catch (error: any) {
      console.error("Error generating items:", error);
      toast.error(error.message || "Failed to generate items");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Grocery Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Describe meals you want to cook this week... (e.g., 'spaghetti carbonara, chicken stir fry, and tacos')"
            value={mealPrompt}
            onChange={(e) => setMealPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
        <Button onClick={handleMealToList} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Shopping List
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Our AI will convert your meal plans into a complete grocery list with estimated prices
        </p>
      </CardContent>
    </Card>
  );
};

export default AIAssistant;