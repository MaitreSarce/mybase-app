import { useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Filter, X } from 'lucide-react';

export const MultiSelect = ({ options, selected, onChange, placeholder = 'Filtrer', testId = '' }) => {
  const [open, setOpen] = useState(false);

  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 text-sm" data-testid={testId}>
          <Filter className="h-3.5 w-3.5" />
          {selected.length === 0 ? placeholder : (
            <span className="flex gap-1 items-center">
              {selected.length} sélectionné{selected.length > 1 ? 's' : ''}
              <X className="h-3 w-3 ml-1 hover:text-destructive" onClick={clear} />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="max-h-60 overflow-y-auto space-y-1">
          {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 cursor-pointer text-sm">
              <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => toggle(opt.value)} />
              {opt.color && <div className={`w-2 h-2 rounded-full ${opt.color}`} />}
              <span className="truncate">{opt.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
