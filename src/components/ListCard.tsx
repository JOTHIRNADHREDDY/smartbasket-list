import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2, Calendar, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ListCardProps {
  list: {
    id: string;
    name: string;
    budget: number;
    shopping_date: string | null;
    itemCount?: number;
    completedCount?: number;
    totalCost?: number;
  };
  onDelete: (id: string) => void;
}

const ListCard = ({ list, onDelete }: ListCardProps) => {
  const navigate = useNavigate();
  const progress = list.itemCount ? (list.completedCount! / list.itemCount) * 100 : 0;
  const isOverBudget = list.budget > 0 && list.totalCost! > list.budget;

  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => navigate(`/list/${list.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{list.name}</CardTitle>
            {list.shopping_date && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                <Calendar className="h-3 w-3" />
                {new Date(list.shopping_date).toLocaleDateString()}
              </div>
            )}
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/list/${list.id}`);
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(list.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <Badge variant={progress === 100 ? "default" : "secondary"}>
            {Math.round(progress)}%
          </Badge>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">${list.totalCost?.toFixed(2) || "0.00"}</span>
            {list.budget > 0 && (
              <span className="text-muted-foreground">
                / ${list.budget.toFixed(2)}
              </span>
            )}
          </div>
          {isOverBudget && (
            <Badge variant="destructive" className="text-xs">
              Over Budget!
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ListCard;