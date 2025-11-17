import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "./ui/select";

export type AlertType = "cuidado" | "perigosa" | "urgente";
export type AlertWord = { word: string; type: AlertType };

interface AlertManagerProps {
  alerts: AlertWord[];
  onChange: (alerts: AlertWord[]) => void;
}

export default function AlertManager({ alerts, onChange }: AlertManagerProps) {
  const [word, setWord] = useState("");
  const [type, setType] = useState<AlertType>("cuidado");

  const add = () => {
    const w = word.trim().toLowerCase();
    if (!w) return;
    const next = [...alerts.filter((a) => a.word !== w), { word: w, type }];
    onChange(next);
    setWord("");
  };

  const remove = (w: string) => {
    onChange(alerts.filter((a) => a.word !== w));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input placeholder="Digite uma palavra" value={word} onChange={(e) => setWord(e.target.value)} />
        <Select value={type} onValueChange={(v) => setType(v as AlertType)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cuidado">Cuidado</SelectItem>
            <SelectItem value="perigosa">Perigosa</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="surface" onClick={add}>Adicionar</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {alerts.map((a) => (
          <div key={a.word} className="flex items-center gap-2 rounded-full border border-panelBorder bg-inputBg px-3 py-1">
            <span className="text-sm text-gray-300">{a.word}</span>
            <span className="text-xs rounded bg-panelBorder px-2 py-0.5 text-gray-100">
              {a.type}
            </span>
            <Button variant="secondary" size="sm" onClick={() => remove(a.word)}>Remover</Button>
          </div>
        ))}
      </div>
    </div>
  );
}