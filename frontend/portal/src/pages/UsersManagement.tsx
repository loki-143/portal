import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleSlash, Edit2, Trash2, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { usersApi } from '../services/api';
import type { User, UserRole, UserStatus } from '../types';

type UserFormState = {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  password: string;
};

function computeInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/g)
    .filter(Boolean);

  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : parts[0]?.[1] ?? '';
  return (first + second).toUpperCase();
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mutatingUserId, setMutatingUserId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormState>({
    name: '',
    email: '',
    role: 'recruiter',
    status: 'Active',
    password: '',
  });

  const sortedUsers = useMemo(() => [...users].sort((a, b) => a.id - b.id), [users]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await usersApi.list();
        if (cancelled) return;
        setUsers(response);
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
  }, []);

  function startEdit(user: User) {
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      password: '',
    });
  }

  function resetForm() {
    setEditingUserId(null);
    setForm({ name: '', email: '', role: 'recruiter', status: 'Active', password: '' });
  }

  async function save() {
    try {
      setIsSaving(true);
      setError(null);

      const name = form.name.trim() || 'New User';
      const payload = {
        name,
        email: form.email.trim(),
        role: form.role,
        status: form.status,
        initials: computeInitials(name),
      } satisfies Omit<User, 'id'>;

      if (editingUserId === null) {
        if (!form.password) {
          throw new Error('Password is required for new users');
        }

        const created = await usersApi.create({
          ...payload,
          password: form.password,
        });
        setUsers((prev) => [...prev, created]);
      } else {
        const updated = await usersApi.update(editingUserId, {
          ...payload,
          ...(form.password ? { password: form.password } : {}),
        });
        setUsers((prev) => prev.map((user) => (user.id === editingUserId ? updated : user)));
      }

      resetForm();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(user: User) {
    try {
      setMutatingUserId(user.id);
      setError(null);

      const nextStatus: UserStatus = user.status === 'Active' ? 'Disabled' : 'Active';
      const updated = await usersApi.update(user.id, { status: nextStatus });
      setUsers((prev) => prev.map((item) => (item.id === user.id ? updated : item)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMutatingUserId(null);
    }
  }

  async function remove(user: User) {
    try {
      setMutatingUserId(user.id);
      setError(null);

      await usersApi.remove(user.id);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));

      if (editingUserId === user.id) {
        resetForm();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMutatingUserId(null);
    }
  }

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      <header className="space-y-2">
        <h1 className="display-md">Users Management</h1>
        <p className="text-on-surface-variant font-medium">Admin-only user administration.</p>
      </header>

      {error && (
        <Card variant="low" className="text-error">
          {error}
        </Card>
      )}

      <Card className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <p className="label-md text-[10px] text-on-surface-variant/50">User Editor</p>
            <h2 className="text-xl font-bold tracking-tight">
              {editingUserId === null ? 'Add User' : 'Edit User'}
            </h2>
          </div>
          <div className="flex gap-3">
            {editingUserId !== null && (
              <Button variant="secondary" onClick={resetForm} disabled={isSaving}>
                Cancel
              </Button>
            )}
            <Button onClick={save} disabled={isSaving}>
              <UserPlus className="w-4 h-4 mr-2" />
              {editingUserId === null ? 'Create User' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="label-md text-[10px] text-on-surface-variant/50">Full Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full bg-surface-container-low border-none rounded-DEFAULT px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="e.g. Julianne Davenport"
              type="text"
            />
          </div>

          <div className="space-y-2">
            <label className="label-md text-[10px] text-on-surface-variant/50">Email Address</label>
            <input
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full bg-surface-container-low border-none rounded-DEFAULT px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="name@coastalseven.com"
              type="email"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="label-md text-[10px] text-on-surface-variant/50">
              Password {editingUserId === null ? '(required)' : '(leave blank to keep)'}
            </label>
            <input
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full bg-surface-container-low border-none rounded-DEFAULT px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder={editingUserId === null ? 'Set an initial password' : 'Reset password (optional)'}
              type="password"
            />
          </div>

          <div className="space-y-2">
            <label className="label-md text-[10px] text-on-surface-variant/50">Role</label>
            <div className="relative">
              <select
                className="w-full bg-surface-container-low border-none rounded-DEFAULT px-4 py-3 focus:ring-2 focus:ring-primary/20 appearance-none"
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
              >
                <option value="admin">Admin</option>
                <option value="recruiter">Recruiter / HR</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="label-md text-[10px] text-on-surface-variant/50">Status</label>
            <div className="relative">
              <select
                className="w-full bg-surface-container-low border-none rounded-DEFAULT px-4 py-3 focus:ring-2 focus:ring-primary/20 appearance-none"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as UserStatus }))}
              >
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">User List</h2>
          <p className="text-sm text-on-surface-variant">{sortedUsers.length} users</p>
        </div>

        {isLoading ? (
          <Card variant="low" className="text-on-surface-variant">
            Loading users…
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    User
                  </th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Role
                  </th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-on-surface-variant/5">
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center font-bold',
                            user.color || 'bg-surface-container-highest text-primary',
                          )}
                        >
                          {user.initials}
                        </div>
                        <div>
                          <div className="font-bold text-on-surface">{user.name}</div>
                          <div className="text-xs text-on-surface-variant">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{user.role}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                          user.status === 'Active'
                            ? 'bg-primary-container/30 text-on-primary-container'
                            : 'bg-surface-container-highest text-on-surface-variant',
                        )}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(user)}
                          className="p-2 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
                          disabled={isSaving || mutatingUserId === user.id}
                          aria-label={`Edit ${user.name}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(user)}
                          className={cn(
                            'p-2 transition-colors disabled:opacity-50',
                            user.status === 'Active'
                              ? 'text-on-surface-variant hover:text-error'
                              : 'text-primary hover:opacity-80',
                          )}
                          disabled={isSaving || mutatingUserId === user.id}
                          aria-label={`Toggle status for ${user.name}`}
                        >
                          {user.status === 'Active' ? (
                            <CircleSlash className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(user)}
                          className="p-2 text-on-surface-variant hover:text-error transition-colors disabled:opacity-50"
                          disabled={isSaving || mutatingUserId === user.id}
                          aria-label={`Delete ${user.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
