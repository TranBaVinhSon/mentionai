import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { SocialNetworkType } from "@/services/api";

interface ConnectedSource {
  id: string | number;
  type: SocialNetworkType;
  username: string;
  createdAt?: string;
}

interface ConnectedSourcesListProps {
  sources: ConnectedSource[];
  syncingSourceIds?: number[];
  onSync?: (id: string | number, type: SocialNetworkType) => void;
  onRemove: (source: ConnectedSource) => void;
  isEditMode?: boolean;
}

export function ConnectedSourcesList({
  sources,
  syncingSourceIds = [],
  onSync,
  onRemove,
  isEditMode = false,
}: ConnectedSourcesListProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-sm font-medium">Connected Sources</h4>
      <div className="space-y-2">
        {sources.map((source) => (
          <div
            key={source.id}
            className="flex items-center justify-between p-2 border rounded-lg"
          >
            <div className="flex items-center gap-2">
              <img
                src={`/icons/${source.type.toLowerCase()}.svg`}
                alt={source.type}
                className="w-5 h-5"
              />
              <span className="text-sm">
                {source.type} - @{source.username}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode && onSync && typeof source.id === 'number' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSync(source.id, source.type)}
                  disabled={syncingSourceIds.includes(source.id)}
                >
                  {syncingSourceIds.includes(source.id) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Sync
                    </>
                  )}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(source)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}