"use client";

import { FileUp, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BrochurePathSelectorProps {
  onSelect: (path: "upload" | "qa") => void;
}

export function BrochurePathSelector({
  onSelect,
}: BrochurePathSelectorProps) {
  const paths = [
    {
      id: "upload" as const,
      icon: FileUp,
      title: "Subir Documento",
      description:
        "Sube tu manual de marca, PDF o imagen con informacion de tu marca",
    },
    {
      id: "qa" as const,
      icon: MessageSquare,
      title: "Responder Preguntas",
      description:
        "Responde algunas preguntas y nuestra IA generara tu perfil de marca",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {paths.map((path) => {
        const Icon = path.icon;
        return (
          <Card
            key={path.id}
            className="cursor-pointer border-2 border-transparent hover:border-primary hover:shadow-lg transition-all duration-200 group"
            onClick={() => onSelect(path.id)}
          >
            <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
              <div className="rounded-full bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">{path.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {path.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
