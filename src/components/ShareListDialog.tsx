import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Trash2 } from "lucide-react";

interface ShareListDialogProps {
  listId: string;
  listName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Share {
  id: string;
  shared_with_email: string;
  permission: string;
  created_at: string;
}

export const ShareListDialog = ({ listId, listName, open, onOpenChange }: ShareListDialogProps) => {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("edit");
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchShares = async () => {
    try {
      const { data, error } = await supabase
        .from("list_shares")
        .select("*")
        .eq("list_id", listId);

      if (error) throw error;
      setShares(data || []);
    } catch (error) {
      console.error("Error fetching shares:", error);
    }
  };

  const handleShare = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("list_shares").insert({
        list_id: listId,
        shared_with_email: email.toLowerCase(),
        shared_by: user.id,
        permission,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error("This list is already shared with this email");
        } else {
          throw error;
        }
      } else {
        toast.success(`List shared with ${email}`);
        setEmail("");
        fetchShares();
      }
    } catch (error) {
      console.error("Error sharing list:", error);
      toast.error("Failed to share list");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from("list_shares")
        .delete()
        .eq("id", shareId);

      if (error) throw error;
      
      toast.success("Share removed");
      fetchShares();
    } catch (error) {
      console.error("Error removing share:", error);
      toast.error("Failed to remove share");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (newOpen) fetchShares();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{listName}"</DialogTitle>
          <DialogDescription>
            Share this list with family members by email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="email"
                  type="email"
                  placeholder="family@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                />
              </div>
              <Mail className="h-10 w-10 text-muted-foreground self-center" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="permission">Permission</Label>
            <Select value={permission} onValueChange={(val: "view" | "edit") => setPermission(val)}>
              <SelectTrigger id="permission">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View Only</SelectItem>
                <SelectItem value="edit">Can Edit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleShare} disabled={loading} className="w-full">
            Share List
          </Button>

          {shares.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <Label>Shared With</Label>
              {shares.map((share) => (
                <div key={share.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{share.shared_with_email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{share.permission}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveShare(share.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
