import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/auth';
import { automationsApi } from '../services/api';
import type { AutomationType } from '../types';

export default function Settings() {
  const { user } = useAuth();
  const role = user?.role ?? 'recruiter';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingType, setSavingType] = useState<AutomationType | null>(null);
  const [drafts, setDrafts] = useState<Record<AutomationType, { template: string; enabled: boolean }>>({
    Welcome: { template: '', enabled: true },
    Rejection: { template: '', enabled: true },
    Shortlist: { template: '', enabled: true },
  });

  useEffect(() => {
    if (role !== 'admin') {
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await automationsApi.list();
        if (cancelled) return;
        setDrafts((prev) => {
          const next = { ...prev };
          for (const automation of response) {
            next[automation.type] = { template: automation.template, enabled: automation.enabled };
          }
          return next;
        });
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [role]);

  async function saveAutomation(type: AutomationType) {
    try {
      setSavingType(type);
      setError(null);

      const updated = await automationsApi.update({
        type,
        template: drafts[type].template,
        enabled: drafts[type].enabled,
      });

      setDrafts((prev) => ({
        ...prev,
        [type]: { template: updated.template, enabled: updated.enabled },
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingType(null);
    }
  }

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      <header className="space-y-2">
        <h1 className="display-md">Settings</h1>
        <p className="text-on-surface-variant font-medium">
          Shared configuration for the unified portal.
        </p>
      </header>

      {error && (
        <Card variant="low" className="text-error">
          {error}
        </Card>
      )}

      <Card className="space-y-2">
        <p className="label-md text-[10px] text-on-surface-variant/50">Signed In As</p>
        <p className="text-lg font-bold text-primary">{user?.name ?? 'User'}</p>
        <p className="text-sm text-on-surface-variant/70">{user?.email ?? ''}</p>
        <p className="text-sm text-on-surface-variant/70">
          Role: <span className="font-bold">{role === 'admin' ? 'Admin' : 'Recruiter / HR'}</span>
        </p>
      </Card>

      <Card className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Email Automations</h2>
          <p className="text-sm text-on-surface-variant">
            {role === 'admin'
              ? 'Edit the templates sent when candidate statuses change.'
              : 'Admin-only templates.'}
          </p>
        </div>

        {role !== 'admin' ? (
          <Card variant="low" className="text-on-surface-variant">
            Switch to the Admin role to manage automations.
          </Card>
        ) : isLoading ? (
          <Card variant="low" className="text-on-surface-variant">
            Loading automations…
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {(['Welcome', 'Rejection', 'Shortlist'] as AutomationType[]).map((type) => (
              <Card key={type} variant="low" className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="label-md text-[10px] text-on-surface-variant/50">Automation</p>
                    <h3 className="text-lg font-bold">{type}</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                      <input
                        type="checkbox"
                        checked={drafts[type].enabled}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [type]: { ...prev[type], enabled: event.target.checked },
                          }))
                        }
                        className="accent-primary"
                      />
                      Enabled
                    </label>
                    <Button
                      onClick={() => saveAutomation(type)}
                      disabled={savingType !== null}
                    >
                      {savingType === type ? 'Saving…' : 'Update'}
                    </Button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={drafts[type].template}
                  onChange={(event) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [type]: { ...prev[type], template: event.target.value },
                    }))
                  }
                  className="w-full bg-surface-container-lowest border-none rounded-DEFAULT px-6 py-4 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder="Enter template message…"
                />

                <p className="text-xs text-on-surface-variant/70">
                  Stored in CSV via <span className="font-mono">/api/automations</span>.
                </p>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
