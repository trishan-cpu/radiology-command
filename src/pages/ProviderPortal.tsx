import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MODALITIES,
  Modality,
  STUDY_TYPES_BY_MODALITY,
  URGENCIES,
  Urgency,
  URGENCY_TAT_MINUTES,
} from "@/lib/constants";

const URGENCY_COLOR: Record<string, string> = {
  Stat: "bg-destructive/15 text-destructive border-destructive/30",
  Urgent: "bg-warning/15 text-warning border-warning/30",
  Routine: "bg-info/15 text-info border-info/30",
};

type RecentCase = {
  id: string;
  case_number: string;
  patient_name: string;
  modality: string;
  study_type: string;
  urgency: string;
  activated_at: string;
};

export default function ProviderPortal() {
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [modality, setModality] = useState<Modality | "">("");
  const [studyType, setStudyType] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("Routine");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recent, setRecent] = useState<RecentCase[]>([]);

  const fetchRecent = async () => {
    const { data } = await supabase
      .from("cases")
      .select("id, case_number, patient_name, modality, study_type, urgency, activated_at")
      .order("activated_at", { ascending: false })
      .limit(5);
    setRecent((data ?? []) as RecentCase[]);
  };

  useEffect(() => {
    fetchRecent();
    const channel = supabase
      .channel("provider-cases")
      .on("postgres_changes", { event: "*", schema: "public", table: "cases" }, fetchRecent)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const studyOptions = modality ? STUDY_TYPES_BY_MODALITY[modality] : [];

  const reset = () => {
    setPatientName("");
    setPatientId("");
    setModality("");
    setStudyType("");
    setUrgency("Routine");
    setNotes("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientId || !modality || !studyType) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    const tatMs = URGENCY_TAT_MINUTES[urgency] * 60 * 1000;
    const { error } = await supabase.from("cases").insert({
      patient_name: patientName,
      patient_id: patientId,
      modality,
      study_type: studyType,
      urgency,
      notes: notes || null,
      status: "pending",
      tat_deadline: new Date(Date.now() + tatMs).toISOString(),
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to activate case", { description: error.message });
      return;
    }
    toast.success("Case activated", { description: `${modality} • ${studyType}` });
    reset();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Provider Portal</h1>
        <p className="text-sm text-muted-foreground">Activate a new radiology case</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Case</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pname">Patient Name *</Label>
                <Input
                  id="pname"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pid">Patient ID *</Label>
                <Input
                  id="pid"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="MRN-12345"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modality *</Label>
                <Select
                  value={modality}
                  onValueChange={(v) => {
                    setModality(v as Modality);
                    setStudyType("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select modality" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALITIES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Study Type *</Label>
                <Select value={studyType} onValueChange={setStudyType} disabled={!modality}>
                  <SelectTrigger>
                    <SelectValue placeholder={modality ? "Select study" : "Pick modality first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {studyOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Urgency Level</Label>
              <RadioGroup
                value={urgency}
                onValueChange={(v) => setUrgency(v as Urgency)}
                className="grid grid-cols-3 gap-2"
              >
                {URGENCIES.map((u) => (
                  <label
                    key={u}
                    htmlFor={`u-${u}`}
                    className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                      urgency === u
                        ? URGENCY_COLOR[u] + " border"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem id={`u-${u}`} value={u} className="sr-only" />
                    <span className="font-medium text-sm">{u}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {URGENCY_TAT_MINUTES[u]}m
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Clinical Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Clinical history, indication, findings of interest…"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Activating…" : "Activate Case"}
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recently Activated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Case #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Study</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Activated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No cases yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.case_number}</TableCell>
                      <TableCell>{c.patient_name}</TableCell>
                      <TableCell>
                        {c.modality} · {c.study_type}
                      </TableCell>
                      <TableCell>
                        <Badge className={URGENCY_COLOR[c.urgency] + " border"}>
                          {c.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.activated_at).toLocaleString()}
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
