import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Customer } from "@/lib/types";
import { Building2, Home, ChevronRight, Calendar, Zap } from "lucide-react";

interface CustomerCardProps {
  customer: Customer;
}

export function CustomerCard({ customer }: CustomerCardProps) {
  const isCommercial = customer.propertyType === "commercial";
  return (
    <Link href={`/estimate/${customer.id}`}>
      <Card className="active:scale-[0.98] transition-all cursor-pointer hover:shadow-md hover:border-primary/30 border-border">
        <CardContent className="p-0">
          {/* Colored top accent strip */}
          <div className={`h-1 rounded-t-lg ${isCommercial ? "bg-primary" : "bg-secondary"}`} />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-base truncate text-foreground">
                    {customer.name}
                  </span>
                  <Badge
                    variant={isCommercial ? "default" : "secondary"}
                    className="shrink-0 text-xs"
                  >
                    {isCommercial ? (
                      <Building2 className="w-3 h-3 mr-1" />
                    ) : (
                      <Home className="w-3 h-3 mr-1" />
                    )}
                    {customer.propertyType}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground truncate mb-2">
                  {customer.address}
                </p>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-primary font-medium">
                    <Zap className="w-3 h-3" />
                    {customer.systemType}
                    {customer.systemAge !== undefined &&
                      ` · ${customer.systemAge} yrs`}
                  </span>
                  {customer.squareFootage && (
                    <span className="text-muted-foreground">{customer.squareFootage.toLocaleString()} sq ft</span>
                  )}
                  {customer.lastServiceDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Last:{" "}
                      {new Date(customer.lastServiceDate).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-primary/60 shrink-0 mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
