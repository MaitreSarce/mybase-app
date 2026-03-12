import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ExternalLink, RefreshCw, Settings2, ChevronDown, ChevronUp } from 'lucide-react';

const STORAGE_KEY = 'mybase_home_assistant_url';

const HomeAssistantPage = () => {
  const [url, setUrl] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const fallback = process.env.REACT_APP_HOME_ASSISTANT_URL || '';
    const resolved = saved || fallback;
    setUrl(resolved);
    setDraftUrl(resolved);
  }, []);

  const handleSave = () => {
    const value = draftUrl.trim();
    localStorage.setItem(STORAGE_KEY, value);
    setUrl(value);
  };

  return (
    <div className="space-y-3" data-testid="home-assistant-page">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Home Assistant</h1>
        <Button type="button" variant="outline" size="sm" onClick={() => setConfigOpen((v) => !v)}>
          <Settings2 className="h-4 w-4 mr-1" />
          Connexion HA
          {configOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
        </Button>
      </div>

      {configOpen && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Parametres de connexion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
              <div className="space-y-1">
                <Label>URL Home Assistant</Label>
                <Input
                  placeholder="http://homeassistant.local:8123"
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                />
              </div>
              <Button type="button" className="self-end" onClick={handleSave}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Charger
              </Button>
              <Button
                type="button"
                variant="outline"
                className="self-end"
                onClick={() => url && window.open(url, '_blank')}
                disabled={!url}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Ouvrir
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Si l'iframe reste vide, autorise l'affichage en iframe dans ta configuration Home Assistant.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardContent className="p-2">
          {url ? (
            <iframe
              title="Home Assistant"
              src={url}
              className="w-full h-[84vh] rounded-md border border-border/60 bg-background"
            />
          ) : (
            <div className="h-[84vh] grid place-items-center text-sm text-muted-foreground">
              Configure une URL Home Assistant pour l'afficher ici.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HomeAssistantPage;
