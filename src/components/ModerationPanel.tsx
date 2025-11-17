import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface ModerationPanelProps {
  dangerThreshold: number;
  urgentThreshold: number;
  onChange: (d: number, u: number) => void;
  suspiciousUsers: string[];
}

export default function ModerationPanel({ dangerThreshold, urgentThreshold, onChange, suspiciousUsers }: ModerationPanelProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-sm text-gray-400">Limite Perigosa</label>
          <Input type="number" value={dangerThreshold} onChange={(e) => onChange(Number(e.target.value), urgentThreshold)} />
          <div className="text-xs text-gray-500">Número de infrações antes de ação perigosa</div>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-400">Limite Urgente</label>
          <Input type="number" value={urgentThreshold} onChange={(e) => onChange(dangerThreshold, Number(e.target.value))} />
          <div className="text-xs text-gray-500">Número de infrações antes de ação urgente</div>
        </div>
      </div>
      <div>
        <div className="mb-2 text-sm text-gray-400">Usuários Suspeitos</div>
        <div className="flex flex-wrap gap-2">
          {suspiciousUsers.map((u) => (
            <Button key={u} variant="secondary" size="sm">{u}</Button>
          ))}
        </div>
      </div>
    </div>
  );
}