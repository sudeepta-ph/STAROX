import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, X, Plus, Settings, Check, Star, Package, Layers } from "lucide-react";

const FAVORITES_KEY = "pmx_fav_products";

export interface Product {
  id: string;
  name: string;
  category: string;
  stage: string;
  workspace: string;
  lastSynced?: string;
}

function ProductRow({ p, isFav, isSelected, isCursor, onSelect, onToggleFav }: {
  p: Product; isFav: boolean; isSelected: boolean; isCursor: boolean;
  onSelect: () => void; onToggleFav: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <div onClick={onSelect}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isCursor ? "bg-muted/60" : "hover:bg-muted/40"}`}
    >
      <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
        <Package className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{p.workspace} · {p.category}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isSelected && <Check className="h-3 w-3 text-primary" />}
        <button onClick={e => onToggleFav(p.id, e)}
          className={`transition-colors ${isFav ? "text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400"}`}>
          <Star className="h-3 w-3" fill={isFav ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}

// Product/workspace switcher with search, favorites, and keyboard nav.
// `variant="compact"` renders a small pill trigger for the topbar; `variant="full"` (default)
// renders the larger card trigger used on the PMX Settings page.
export default function ProductSwitcher({
  products, selected, onSelect, onCreateNew, onManage, variant = "full",
}: {
  products: Product[];
  selected: Product | null;
  onSelect: (p: Product) => void;
  onCreateNew: () => void;
  onManage: () => void;
  variant?: "full" | "compact" | "add";
}) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [favs, setFavs]       = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
  });
  const [cursor, setCursor]   = useState(0);
  const inputRef              = useRef<HTMLInputElement>(null);
  const containerRef          = useRef<HTMLDivElement>(null);

  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id];
    setFavs(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  };

  const filtered = products.filter(p =>
    !query || [p.name, p.workspace, p.category].some(f => f.toLowerCase().includes(query.toLowerCase()))
  );
  const recents  = products.slice(0, 3);
  const favList  = products.filter(p => favs.includes(p.id));

  const allVisible = query ? filtered : products;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, allVisible.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && allVisible[cursor]) { onSelect(allVisible[cursor]); setOpen(false); setQuery(""); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${variant === "full" ? "w-full" : ""}`}>
      {variant === "add" ? (
        <button
          onClick={() => setOpen(o => !o)}
          title="Open another workspace"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-border/60 text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : variant === "compact" ? (
        <button
          onClick={() => setOpen(o => !o)}
          title="Switch or manage workspaces"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/60 hover:border-border hover:bg-muted/40 text-xs font-medium text-foreground/80 hover:text-foreground transition-colors max-w-[160px]"
        >
          <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{selected ? selected.name : "Select product"}</span>
          <ChevronDown className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 bg-card border border-border hover:border-ring/50 rounded-xl px-4 py-3 text-left transition-all group"
        >
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {selected ? selected.name : "Select a product..."}
            </p>
            {selected && <p className="text-[10px] text-muted-foreground truncate">{selected.workspace} · {selected.category}</p>}
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.13 }}
            className={`absolute top-full mt-1.5 z-50 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden ${variant === "full" ? "left-0 right-0" : "left-0 w-72"}`}
          >
            {/* Search */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setCursor(0); }}
                onKeyDown={handleKey}
                placeholder="Search products..."
                className="flex-1 bg-transparent text-xs text-foreground focus:outline-none placeholder:text-muted-foreground"
              />
              {query && <button onClick={() => setQuery("")}><X className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>}
            </div>

            <div className="max-h-72 overflow-y-auto py-1">
              {!query && favList.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Starred</p>
                  {favList.map((p, i) => <ProductRow key={p.id} p={p} isFav={true} isSelected={selected?.id === p.id} isCursor={cursor === i} onSelect={() => { onSelect(p); setOpen(false); setQuery(""); }} onToggleFav={toggleFav} />)}
                  <div className="mx-3 my-1 border-t border-border/50" />
                </>
              )}
              {!query && (
                <>
                  <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Recent</p>
                  {recents.map((p, i) => <ProductRow key={p.id} p={p} isFav={favs.includes(p.id)} isSelected={selected?.id === p.id} isCursor={cursor === i + favList.length} onSelect={() => { onSelect(p); setOpen(false); setQuery(""); }} onToggleFav={toggleFav} />)}
                  <div className="mx-3 my-1 border-t border-border/50" />
                  <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">All Products</p>
                </>
              )}
              {allVisible.map((p, i) => (
                <ProductRow key={p.id} p={p} isFav={favs.includes(p.id)} isSelected={selected?.id === p.id}
                  isCursor={cursor === i} onSelect={() => { onSelect(p); setOpen(false); setQuery(""); }} onToggleFav={toggleFav} />
              ))}
              {allVisible.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground text-center">No products found</p>}
            </div>

            {/* Footer actions */}
            <div className="border-t border-border flex divide-x divide-border">
              <button onClick={() => { onCreateNew(); setOpen(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                <Plus className="h-3.5 w-3.5" /> New Product
              </button>
              <button onClick={() => { onManage(); setOpen(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                <Settings className="h-3.5 w-3.5" /> Manage Products
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
