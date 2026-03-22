import { useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { ChevronDown, ChevronRight, Filter, X } from 'lucide-react';

export const MultiSelect = ({ options, selected, onChange, placeholder = 'Filtrer', testId = '', hierarchical = false }) => {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState({});

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

  const toggleExpanded = (value) => {
    setExpanded((prev) => ({ ...prev, [value]: !prev[value] }));
  };

  const renderOption = (opt, depth = 0) => {
    const children = Array.isArray(opt.children) ? opt.children : [];
    const hasChildren = children.length > 0;
    const isOpen = expanded[opt.value] ?? false;

    return (
      <div key={opt.value} className="space-y-1">
        <label
          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 cursor-pointer text-sm"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              className="h-4 w-4 flex items-center justify-center text-muted-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleExpanded(opt.value);
              }}
              aria-label={isOpen ? 'Réduire' : 'Développer'}
            >
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="h-4 w-4" />
          )}
          <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => toggle(opt.value)} />
          {opt.color && <div className={`w-2 h-2 rounded-full ${opt.color}`} />}
          <span className="truncate">{opt.label}</span>
        </label>
        {hasChildren && isOpen && (
          <div className="space-y-1">
            {children.map((child) => renderOption(child, depth + 1))}
          </div>
        )}
      </div>
    );
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
      <PopoverContent className="w-64 p-2 max-h-[70vh]" align="start">
        <div
          className="max-h-[55vh] overflow-y-auto pr-1 space-y-1"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {hierarchical
            ? options.map((opt) => renderOption(opt))
            : options.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 cursor-pointer text-sm">
                <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => toggle(opt.value)} />
                {opt.color && <div className={`w-2 h-2 rounded-full ${opt.color}`} />}
                <span className="truncate">{opt.label}</span>
              </label>
            ))
          }
        </div>
      </PopoverContent>
    </Popover>
  );
};

