import Link from "next/link";
import { getCustomers } from "@/lib/data";
import { CustomerSearch } from "@/components/CustomerSearch";
import { Wrench, BookmarkCheck } from "lucide-react";

export default function CustomerSelectionPage() {
  const customers = getCustomers();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold leading-tight">
                Field Estimate Tool
              </h1>
              <p className="text-xs text-muted-foreground">Step 1 of 3 — Select a customer to begin</p>
            </div>
            <Link href="/estimates">
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors text-muted-foreground">
                <BookmarkCheck className="w-3.5 h-3.5" />
                Saved
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        <CustomerSearch customers={customers} />
      </main>
    </div>
  );
}
