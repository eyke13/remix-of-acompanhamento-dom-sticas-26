import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Competencia } from "./domain";

interface Ctx {
  competencias: Competencia[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  selected: Competencia | null;
  isLoading: boolean;
  refetch: () => void;
}

const CompetenciaCtx = createContext<Ctx | null>(null);

export function CompetenciaProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["competencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competencias")
        .select("*")
        .order("ano", { ascending: false })
        .order("mes", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Competencia[];
    },
  });

  const [selectedId, setSelectedIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("elite.comp") : null;
    if (stored && data?.some((c) => c.id === stored)) {
      setSelectedIdState(stored);
    } else if (data && data.length > 0) {
      setSelectedIdState(data[0].id);
    }
  }, [data]);

  const setSelectedId = (id: string) => {
    setSelectedIdState(id);
    if (typeof window !== "undefined") localStorage.setItem("elite.comp", id);
  };

  const selected = data?.find((c) => c.id === selectedId) ?? null;

  return (
    <CompetenciaCtx.Provider
      value={{
        competencias: data ?? [],
        selectedId,
        setSelectedId,
        selected,
        isLoading,
        refetch: () => void refetch(),
      }}
    >
      {children}
    </CompetenciaCtx.Provider>
  );
}

export function useCompetencia() {
  const ctx = useContext(CompetenciaCtx);
  if (!ctx) throw new Error("useCompetencia must be used inside CompetenciaProvider");
  return ctx;
}