import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Activity, UserCheck, CheckCircle2, Search } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { MODALITIES, URGENCIES } from "@/lib/constants";

type CaseRow = {
  id: string;
  case_number: string;
  patient_name: string;
  patient_id: string;
  modality: string;
  study_type: string;
  urgency: string;
  status: string;
  activated_at: string;
  tat_deadline: string;
  completed_at: string | null;
  assigned_to: string | null;
  radiologists?: { name: string } | null;
};

const URGENCY_VARIANT: Record<string, string> = {
  Stat: "bg-destructive/15 text-destructive border-destructive/30",
  Urgent: "bg-warning/15 text-warning border-warning/30",
  Routine: "bg-info/15 text-info border-info/30",
};

const STATUS_VARIANT: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  assigned: "bg-info/15 text-info border-info/30",
  in_progress: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-success/15 text-success border-success/30",
};

const CHART_COLORS = [
  "hsl(199 89% 48%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(280 70% 60%)",
  "hsl(340 75% 55%)",
  "hsl(180 60% 50%)",
];

function Countdown({ deadline, status }: { deadline: string; status: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (status === "completed") {
    return <span className="text-success text-xs">Done</span>;
  }

  const diff = new Date(deadline).getTime() - now;
  const overdue = diff < 0;
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const secs = Math.floor((abs % 60000) / 1000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;

  const text = h > 0 ? `${h}h ${m}m` : `${m}m ${secs}s`;
  const cls = overdue
    ? "text-destructive font-semibold"
    : diff < 30 * 60 * 1000
      ? "text-warning font-semibold"
      : "text-foreground";

  return (
    <span className={cls + " font-mono text-xs tabular-nums"}>
      {overdue ? "-" : ""}
      {text}
    </span>
  );
}

export default function OpsCommandCenter() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [activeRads, setActiveRads] = useState(0);
  const [search, setSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [, setTick] = useState(0);

  const fetchAll = async () => {
    const { data: caseData } = await supabase
      .from("cases")
      .select("*, radiologists(name)")
      .order("activated_at", { ascending: false });
    setCases((caseData ?? []) as CaseRow[]);

    const { count } = await supabase
      .from("radiologists")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    setActiveRads(count ?? 0);
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("ops-cases")
      .on("postgres_changes", { event: "*", schema: "public", table: "cases" }, fetchAll)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "radiologists" },
        fetchAll,
      )
      .subscribe();
    const tickId = setInterval(() => setTick((t) => t + 1), 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(tickId);
    };
  }, []);

  const now = Date.now();
  const totalPool = cases.filter((c) => c.status === "pending").length;
  const slaAtRisk = cases.filter(
    (c) =>
      c.status !== "completed" &&
      new Date(c.tat_deadline).getTime() - now < 30 * 60 * 1000,
  ).length;
  const completedToday = cases.filter((c) => {
    if (c.status !== "completed" || !c.completed_at) return false;
    const d = new Date(c.completed_at);
    const t = new Date();
    return (
      d.getFullYear() === t.getFullYear() &&
      d.getMonth() === t.getMonth() &&
      d.getDate() === t.getDate()
    );
  }).length;

  const studyData = useMemo(() => {
    const map = new Map<string, number>();
    cases.forEach((c) => map.set(c.study_type, (map.get(c.study_type) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [cases]);

  const modalityData = useMemo(() => {
    const map = new Map<string, number>();
    cases.forEach((c) => map.set(c.modality, (map.get(c.modality) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [cases]);

  const filtered = cases.filter((c) => {
    if (modalityFilter !== "all" && c.modality !== modalityFilter) return false;
    if (urgencyFilter !== "all" && c.urgency !== urgencyFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !c.case_number.toLowerCase().includes(q) &&
        !c.patient_name.toLowerCase().includes(q) &&
        !c.study_type.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Radiology Operations Command Center</h1>
        <p className="text-sm text-muted-foreground">Real-time monitoring of cases and radiologists</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total in Pool"
          value={totalPool}
          icon={<Activity className="h-4 w-4" />}
          tone="info"
        />
        <KpiCard
          label="SLA at Risk"
          value={slaAtRisk}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="destructive"
        />
        <KpiCard
          label="Active Radiologists"
          value={activeRads}
          icon={<UserCheck className="h-4 w-4" />}
          tone="success"
        />
        <KpiCard
          label="Completed Today"
          value={completedToday}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="primary"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Volume by Study</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {studyData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studyData}>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modality Mix</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {modalityData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modalityData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {modalityData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Case Monitor */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Live Case Monitor</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search case, patient, study…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-full sm:w-64"
              />
            </div>
            <Select value={modalityFilter} onValueChange={setModalityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Modality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modalities</SelectItem>
                {MODALITIES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgencies</SelectItem>
                {URGENCIES.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Case #</TableHead>
                  <TableHead>Study</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activated</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No cases match your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.case_number}</TableCell>
                      <TableCell>{c.study_type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {c.modality}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={URGENCY_VARIANT[c.urgency] + " border"}>
                          {c.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_VARIANT[c.status] + " border capitalize"}>
                          {c.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.activated_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Countdown deadline={c.tat_deadline} status={c.status} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.radiologists?.name ?? (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "info" | "destructive" | "success" | "primary";
}) {
  const toneClass = {
    info: "text-info bg-info/10",
    destructive: "text-destructive bg-destructive/10",
    success: "text-success bg-success/10",
    primary: "text-primary bg-primary/10",
  }[tone];
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1 tabular-nums">{value}</p>
          </div>
          <div className={"rounded-md p-2 " + toneClass}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      No data yet — activate cases in the Provider Portal
    </div>
  );
}
