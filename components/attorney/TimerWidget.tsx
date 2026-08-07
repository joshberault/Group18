"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { checkMatterBillable } from "@/lib/matters/matter-activation-gates";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

const TIMER_KEY = "counselflow-attorney-timer";

type TimerState = {
  running: boolean;
  startedAt: number | null;
  accumulatedMs: number;
  matterId: string;
  description: string;
  isBillable: boolean;
};

function loadTimer(): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    return raw ? (JSON.parse(raw) as TimerState) : null;
  } catch {
    return null;
  }
}

function saveTimer(state: TimerState | null) {
  if (!state) {
    localStorage.removeItem(TIMER_KEY);
    return;
  }
  localStorage.setItem(TIMER_KEY, JSON.stringify(state));
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, "0")).join(":");
}

export function TimerWidget() {
  const { matters, profileId, addTimeEntry } = useAttorneyData();
  const [timer, setTimer] = useState<TimerState>({
    running: false,
    startedAt: null,
    accumulatedMs: 0,
    matterId: matters[0]?.id ?? "",
    description: "",
    isBillable: true,
  });
  const [displayMs, setDisplayMs] = useState(0);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadTimer();
    if (stored) setTimer(stored);
  }, []);

  useEffect(() => {
    saveTimer(timer);
  }, [timer]);

  useEffect(() => {
    if (!timer.running || !timer.startedAt) {
      setDisplayMs(timer.accumulatedMs);
      return;
    }

    const tick = () => {
      setDisplayMs(timer.accumulatedMs + (Date.now() - timer.startedAt!));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timer]);

  function startTimer() {
    setTimer((prev) => ({
      ...prev,
      running: true,
      startedAt: Date.now(),
    }));
    setSavedMessage(null);
  }

  function pauseTimer() {
    setTimer((prev) => {
      if (!prev.running || !prev.startedAt) return prev;
      return {
        ...prev,
        running: false,
        accumulatedMs: prev.accumulatedMs + (Date.now() - prev.startedAt),
        startedAt: null,
      };
    });
  }

  async function stopAndSave() {
    const elapsedMs =
      timer.accumulatedMs +
      (timer.running && timer.startedAt ? Date.now() - timer.startedAt : 0);
    const hours = Math.max(0.1, Math.round((elapsedMs / 3600000) * 10) / 10);

    if (!timer.matterId || !timer.description.trim()) {
      setSavedMessage("Select a matter and add a description before saving.");
      return;
    }

    const gate = await checkMatterBillable(timer.matterId);
    if (!gate.allowed) {
      setSavedMessage(gate.reason ?? "Time entry is blocked for this matter.");
      return;
    }

    addTimeEntry({
      matter_id: timer.matterId,
      profile_id: profileId,
      entry_date: new Date().toISOString().slice(0, 10),
      hours,
      description: timer.description.trim(),
      is_billable: timer.isBillable,
    });

    const reset: TimerState = {
      running: false,
      startedAt: null,
      accumulatedMs: 0,
      matterId: timer.matterId,
      description: "",
      isBillable: timer.isBillable,
    };
    setTimer(reset);
    saveTimer(null);
    setSavedMessage(`Saved ${hours}h from timer.`);
  }

  return (
    <Card padding="md">
      <CardTitle className="mb-4">Start Timer</CardTitle>
      <div className="space-y-4">
        <div className="rounded-lg bg-navy-900 px-4 py-5 text-center">
          <p className="font-mono text-4xl font-semibold tracking-wider text-gold-500">
            {formatElapsed(displayMs)}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {timer.running ? "Timer running" : "Timer paused"}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Matter"
            value={timer.matterId}
            onChange={(e) => setTimer((prev) => ({ ...prev, matterId: e.target.value }))}
            options={matters.map((matter) => ({ value: matter.id, label: matter.title }))}
          />
          <label className="flex items-center gap-2 self-end text-sm text-navy-900">
            <input
              type="checkbox"
              checked={timer.isBillable}
              onChange={(e) => setTimer((prev) => ({ ...prev, isBillable: e.target.checked }))}
            />
            Billable hours
          </label>
          <div className="md:col-span-2">
            <Textarea
              label="Work description"
              value={timer.description}
              onChange={(e) => setTimer((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="What are you working on?"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!timer.running ? (
            <Button type="button" onClick={startTimer}>
              <Play className="mr-2 h-4 w-4" />
              Start
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={pauseTimer}>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={stopAndSave}>
            <Square className="mr-2 h-4 w-4" />
            Stop & Save Entry
          </Button>
        </div>

        {savedMessage && <p className="text-sm text-muted">{savedMessage}</p>}
      </div>
    </Card>
  );
}
