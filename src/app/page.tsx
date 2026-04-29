import Link from "next/link";
import { getCustomers } from "@/lib/data";
import { CustomerSearch } from "@/components/CustomerSearch";
import { Wrench, BookmarkCheck } from "lucide-react";

export default function CustomerSelectionPage() {
  const customers = getCustomers();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm">
              <Wrench className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold leading-tight text-foreground">
                Field Estimate Tool
              </h1>
              <p className="text-xs text-muted-foreground">HVAC · Select a customer to begin</p>
            </div>
            <Link href="/estimates">
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-primary">
                <BookmarkCheck className="w-3.5 h-3.5" />
                Saved
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        <CustomerSearch customers={customers} />
      </main>
    </div>
  );
}
