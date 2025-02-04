import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function SearchInput({ searchTerm, onSearchChange }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-9"
        placeholder="Buscar videos..."
      />
    </div>
  );
}
