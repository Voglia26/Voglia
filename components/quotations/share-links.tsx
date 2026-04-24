"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, CheckCircle2 } from "lucide-react";

type QfView = {
  id: string;
  factory_id: string;
  factory_name: string;
  token: string;
  accepted_at: string | null;
  assigned_count: number;
  quotes_count: number;
};

export function ShareLinks({
  quotationFactories,
}: {
  quotationFactories: QfView[];
}) {
  return (
    <div className="grid gap-2">
      {quotationFactories.map((qf) => (
        <ShareLinkRow key={qf.id} qf={qf} />
      ))}
    </div>
  );
}

function ShareLinkRow({ qf }: { qf: QfView }) {
  const [copied, setCopied] = useState(false);
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = `${baseUrl}/q/${qf.token}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const isAccepted = !!qf.accepted_at;

  return (
    <Card className="p-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">{qf.factory_name}</span>
          {isAccepted ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Accepted · {qf.quotes_count}/{qf.assigned_count}
            </Badge>
          ) : (
            <Badge variant="outline">
              Pending · {qf.assigned_count} item{qf.assigned_count !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <code className="text-xs text-muted-foreground truncate block">{url}</code>
      </div>
      <Button size="sm" variant="outline" onClick={copy}>
        {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </Card>
  );
}
