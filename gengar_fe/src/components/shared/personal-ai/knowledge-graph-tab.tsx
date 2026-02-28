"use client";

import { usePublishedAppKnowledgeGraph } from "@/hooks/use-published-app-knowledge-graph";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  person: "bg-blue-500",
  topic: "bg-green-500",
  skill: "bg-purple-500",
  organization: "bg-orange-500",
  platform: "bg-cyan-500",
  interest: "bg-pink-500",
};

const TYPE_BADGE_VARIANTS: Record<string, string> = {
  person: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  topic: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  skill: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  organization: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  platform: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  interest: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

interface KnowledgeGraphTabProps {
  appName: string;
}

export function KnowledgeGraphTab({ appName }: KnowledgeGraphTabProps) {
  const { data, isLoading } = usePublishedAppKnowledgeGraph(appName);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const graph = data?.knowledgeGraph;

  if (!graph || !graph.nodes?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No knowledge graph available yet</p>
      </div>
    );
  }

  // Group nodes by type
  const nodesByType: Record<string, typeof graph.nodes> = {};
  for (const node of graph.nodes) {
    if (!nodesByType[node.type]) {
      nodesByType[node.type] = [];
    }
    nodesByType[node.type].push(node);
  }

  // Build connection map for each node
  const connectionMap: Record<string, Array<{ target: string; label: string }>> = {};
  for (const edge of graph.edges) {
    if (!connectionMap[edge.source]) {
      connectionMap[edge.source] = [];
    }
    connectionMap[edge.source].push({
      target: edge.target,
      label: edge.label,
    });
  }

  // Find node by id
  const findNode = (id: string) => graph.nodes.find((n) => n.id === id);

  // Get person node
  const personNode = graph.nodes.find((n) => n.type === "person");

  return (
    <div className="space-y-6">
      {/* Central person node with direct connections */}
      {personNode && connectionMap[personNode.id] && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${TYPE_COLORS["person"]}`}
            />
            <h3 className="text-sm font-semibold">{personNode.label}</h3>
          </div>
          <div className="flex flex-wrap gap-2 pl-5">
            {connectionMap[personNode.id].map((conn) => {
              const targetNode = findNode(conn.target);
              if (!targetNode) return null;
              return (
                <Badge
                  key={conn.target}
                  variant="outline"
                  className={`text-xs ${
                    TYPE_BADGE_VARIANTS[targetNode.type] || ""
                  }`}
                >
                  <span className="opacity-60 mr-1">{conn.label}</span>
                  {targetNode.label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Grouped nodes by type */}
      {Object.entries(nodesByType)
        .filter(([type]) => type !== "person")
        .sort(([, a], [, b]) => b.length - a.length)
        .map(([type, nodes]) => (
          <div key={type} className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  TYPE_COLORS[type] || "bg-gray-500"
                }`}
              />
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {type.replace(/_/g, " ")}s
              </h4>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-5">
              {nodes
                .sort((a, b) => b.weight - a.weight)
                .map((node) => {
                  const connections = connectionMap[node.id] || [];
                  return (
                    <Badge
                      key={node.id}
                      variant="outline"
                      className={`text-xs ${
                        TYPE_BADGE_VARIANTS[type] || ""
                      }`}
                      title={
                        connections.length > 0
                          ? connections
                              .map((c) => {
                                const t = findNode(c.target);
                                return `${c.label} ${t?.label || c.target}`;
                              })
                              .join(", ")
                          : undefined
                      }
                    >
                      {node.label}
                      {node.weight >= 7 && (
                        <span className="ml-1 opacity-40">●</span>
                      )}
                    </Badge>
                  );
                })}
            </div>
          </div>
        ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t text-xs text-muted-foreground">
        {Object.entries(TYPE_COLORS)
          .filter(([type]) => nodesByType[type])
          .map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span className="capitalize">{type.replace(/_/g, " ")}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
