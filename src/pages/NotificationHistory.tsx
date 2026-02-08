import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/AppLayout";

interface NotificationLog {
  id: string;
  visit_id: string;
  lead_email: string;
  notification_type: string;
  sent_at: string;
  visits: {
    scheduled_at: string;
    lead_confirmed: boolean;
    leads: {
      name: string;
    };
    properties: {
      name: string;
    };
    units?: {
      unit_number: string;
    } | null;
  };
}

export default function NotificationHistory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadNotificationLogs();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadNotificationLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notification_logs")
        .select(`
          *,
          visits (
            scheduled_at,
            lead_confirmed,
            leads (name),
            properties (name),
            units (unit_number)
          )
        `)
        .eq("broker_id", user.id)
        .order("sent_at", { ascending: false });

      if (error) throw error;

      setLogs(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    return type === "24h" ? "24 horas antes" : "2 horas antes";
  };

  const getNotificationTypeBadge = (type: string) => {
    return type === "24h" ? "default" : "secondary";
  };

  return (
    <AppLayout title="Histórico de Notificações">
      <Card>
        <CardHeader>
          <CardTitle>Notificações Enviadas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">
              Carregando histórico...
            </p>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma notificação enviada ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data de Envio</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Empreendimento</TableHead>
                    <TableHead>Visita Agendada</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.sent_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getNotificationTypeBadge(log.notification_type)}>
                          {getNotificationTypeLabel(log.notification_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.visits.leads.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.lead_email}
                      </TableCell>
                      <TableCell>
                        {log.visits.properties.name}
                        {log.visits.units && (
                          <span className="text-muted-foreground text-sm">
                            {" "}
                            - Un. {log.visits.units.unit_number}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(log.visits.scheduled_at).toLocaleString(
                          "pt-BR"
                        )}
                      </TableCell>
                      <TableCell>
                        {log.visits.lead_confirmed ? (
                          <Badge variant="default" className="bg-green-600">
                            ✓ Confirmado
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pendente</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
