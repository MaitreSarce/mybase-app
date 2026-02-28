import { LayoutGrid, List } from 'lucide-react';
import { Button } from './ui/button';

export const ViewToggle = ({ view, onChange }) => (
  <div className="flex border border-border rounded-md overflow-hidden" data-testid="view-toggle">
    <Button variant={view === 'card' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none"
      onClick={() => onChange('card')} data-testid="view-card-btn">
      <LayoutGrid className="h-4 w-4" />
    </Button>
    <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none"
      onClick={() => onChange('table')} data-testid="view-table-btn">
      <List className="h-4 w-4" />
    </Button>
  </div>
);
