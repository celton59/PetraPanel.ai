import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@db/schema";

interface RoleSelectorProps {
  value: User['role'];
  onChange: (value: User['role']) => void;
}

export function RoleSelector ({ value, onChange }: RoleSelectorProps) {

  const roles: Record<User['role'], string> = {
    youtuber: "Youtuber",
    reviewer: "Reviewer",
    optimizer: "Optimizer",
    admin: 'Admin',
    content_reviewer: 'Content Reviewer',
    media_reviewer: 'Media Reviewer',
  }
  
  return (
    <Select value={value} onValueChange={(val) => onChange(val as User['role'])}>
      <SelectTrigger>
        <SelectValue placeholder="Selecciona un rol" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(roles).map( ([key, value]) => (
          <SelectItem key={key} value={key}>
            {value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};