"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, UserCircle, Users, X, FileImage, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { POST_STATUS_LABELS, POST_STATUS_COLORS, NETWORK_LABELS, NETWORK_COLORS } from "@isysocial/shared";
import type { PostStatus, SocialNetwork } from "@isysocial/shared";

function getRolePrefix(role: string): string {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin";
  if (role === "EDITOR") return "/editor";
  return "/cliente";
}

export function GlobalSearch() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const prefix = getRolePrefix(role || "CLIENTE");

  // Search clients (admin only)
  const { data: clients, isFetching: fetchingClients } = trpc.clients.list.useQuery(
    { search: query.trim(), page: 1, limit: 5 },
    { enabled: isAdmin && open && query.trim().length >= 1 }
  );

  // Search editors (admin only)
  const { data: editors, isFetching: fetchingEditors } = trpc.editors.list.useQuery(
    { search: query.trim(), page: 1, limit: 5 },
    { enabled: isAdmin && open && query.trim().length >= 1 }
  );

  // Search posts (all roles)
  const { data: posts, isFetching: fetchingPosts } = trpc.posts.list.useQuery(
    { search: query.trim(), page: 1, limit: 5 },
    { enabled: open && query.trim().length >= 2 }
  );

  const isFetching = fetchingClients || fetchingEditors || fetchingPosts;
  const hasClients = isAdmin && (clients?.clients?.length ?? 0) > 0;
  const hasEditors = isAdmin && (editors?.editors?.length ?? 0) > 0;
  const hasPosts = (posts?.posts?.length ?? 0) > 0;
  const hasResults = hasClients || hasEditors || hasPosts;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigateTo = useCallback(
    (path: string) => {
      router.push(path);
      setOpen(false);
      setQuery("");
    },
    [router]
  );

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger button */}
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/20"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg mx-4 rounded-xl border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar contenido, clientes, editores..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                autoFocus
              />
              {isFetching && query.trim() && (
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
              )}
              {query && (
                <button
                  onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd
                className="hidden sm:inline-flex h-6 items-center rounded border bg-muted px-1.5 text-[11px] font-mono text-muted-foreground cursor-pointer"
                onClick={() => setOpen(false)}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {!query.trim() && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Escribe para buscar contenido{isAdmin ? ", clientes o editores" : ""}
                </div>
              )}

              {query.trim().length >= 1 && !hasResults && !isFetching && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No se encontraron resultados para &quot;{query}&quot;
                </div>
              )}

              {/* Posts / Content */}
              {hasPosts && (
                <div className="p-2">
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contenido
                  </p>
                  {posts!.posts.map((post) => {
                    const thumbnail = (post as any).media?.[0]?.fileUrl;
                    const statusColor = POST_STATUS_COLORS[post.status as PostStatus] || "";
                    const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";
                    return (
                      <button
                        key={post.id}
                        onClick={() => navigateTo(`${prefix}/contenido/${post.id}`)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-accent transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {thumbnail ? (
                            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileImage className="h-4 w-4 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {post.title || (post as any).copy?.slice(0, 40) || "Sin título"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: networkColor }}
                            >
                              {NETWORK_LABELS[post.network as SocialNetwork]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {(post as any).client?.companyName}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className={`text-[10px] ${statusColor}`}>
                          {POST_STATUS_LABELS[post.status as PostStatus]}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Clients */}
              {hasClients && (
                <div className={`p-2 ${hasPosts ? "border-t" : ""}`}>
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Clientes
                  </p>
                  {clients!.clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => navigateTo(`/admin/clientes/${client.id}`)}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex-shrink-0">
                        <UserCircle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{client.companyName}</p>
                        <p className="text-xs text-muted-foreground truncate">{client.user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Editors */}
              {hasEditors && (
                <div className={`p-2 ${hasPosts || hasClients ? "border-t" : ""}`}>
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Editores
                  </p>
                  {editors!.editors.map((editor) => (
                    <button
                      key={editor.id}
                      onClick={() => navigateTo("/admin/equipo")}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex-shrink-0">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{editor.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{editor.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
