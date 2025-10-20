import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import { Progress } from "@/components/ui/progress";

interface BudgetBarProps {
  budget: number;
  totalCost: number;
}

const BudgetBar = ({ budget, totalCost }: BudgetBarProps) => {
  if (budget <= 0) return null;

  const percentage = (totalCost / budget) * 100;
  const remaining = budget - totalCost;
  
  // Define states
  const isOverBudget = totalCost > budget;
  const isNearBudget = !isOverBudget && percentage >= 85;
  const isUnderBudget = percentage < 85;

  // Colors and icons based on state
  let statusColor = "text-green-600 dark:text-green-400";
  let bgColor = "bg-green-50 dark:bg-green-950/30";
  let borderColor = "border-green-200 dark:border-green-800";
  let Icon = CheckCircle2;
  let message = "Within budget! 🎉";

  if (isOverBudget) {
    statusColor = "text-destructive";
    bgColor = "bg-destructive/10";
    borderColor = "border-destructive/30";
    Icon = AlertCircle;
    message = `Oops! Over budget by ${formatPrice(Math.abs(remaining))}! 😅`;
  } else if (isNearBudget) {
    statusColor = "text-amber-600 dark:text-amber-400";
    bgColor = "bg-amber-50 dark:bg-amber-950/30";
    borderColor = "border-amber-200 dark:border-amber-800";
    Icon = AlertTriangle;
    message = "Close to budget limit! 😬";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border ${bgColor} ${borderColor}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${statusColor}`} />
          <span className={`font-semibold ${statusColor}`}>{message}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatPrice(totalCost)} / {formatPrice(budget)}
        </span>
      </div>

      <Progress 
        value={Math.min(percentage, 100)} 
        className="h-3"
      />

      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
        <span>{percentage.toFixed(0)}% used</span>
        {!isOverBudget && (
          <span>{formatPrice(remaining)} remaining</span>
        )}
      </div>
    </motion.div>
  );
};

export default BudgetBar;
