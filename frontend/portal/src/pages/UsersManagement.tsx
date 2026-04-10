import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Search, Edit2, Trash2, UserCheck, UserX, Shield } from 'lucide-react';
import { usersApi } from '../services/api';
import type { User, UserRole, UserStatus } from '../types';
import { toast } from '../lib/toast';

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'candidate' as UserRole,
    status: 'active' as UserStatus,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await usersApi.list();
      setUsers(response.users || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    setEditingUser(null);
    setForm({ first_name: '', last_name: '', email: '', password: '', role: 'candidate', status: 'active' });
    setShowModal(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          first_name: form.first_name.trim() || undefined,
          last_name: form.last_name.trim() || undefined,
          role: form.role || undefined,
          status: form.status || undefined,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success('User updated');
      } else {
        await usersApi.create({
          email: form.email.trim(),
          password: form.password,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          role: form.role,
          status: form.status,
        });
        toast.success('User created');
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      toast.error(editingUser ? 'Failed to update user' : 'Failed to create user', (err as Error).message);
    }
  }

  async function toggleStatus(user: User) {
    const nextStatus: UserStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      await usersApi.update(user.id, { status: nextStatus });
      setUsers(users.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
      toast.success(`User ${nextStatus === 'active' ? 'activated' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to update user status', (err as Error).message);
    }
  }

  async function deleteUser(user: User) {
    if (!confirm(`Disable user ${user.first_name} ${user.last_name}?`)) return;
    try {
      await usersApi.remove(user.id);
      setUsers(users.filter(u => u.id !== user.id));
      toast.success('User disabled');
    } catch (err) {
      toast.error('Failed to disable user', (err as Error).message);
    }
  }

  const filtered = users.filter(user => {
    const matchesSearch = searchQuery
      ? `${user.first_name || ''} ${user.last_name || ''} ${user.email}`.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesRole = roleFilter ? user.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  const roleCounts = {
    admin: users.filter(u => u.role === 'admin').length,
    recruiter: users.filter(u => u.role === 'recruiter').length,
    candidate: users.filter(u => u.role === 'candidate').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h1 className="display-md">Users</h1>
          <p className="text-on-surface-variant font-medium">Manage platform users, roles, and permissions.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </header>

      {error && (
        <Card variant="low" className="text-error">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline text-sm">Dismiss</button>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="highest">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Total</p>
              <p className="text-2xl font-black">{users.length}</p>
            </div>
          </div>
        </Card>
        <Card variant="high">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center text-purple-600 font-black text-xs">A</div>
            <div>
              <p className="text-xs text-on-surface-variant/50">Admins</p>
              <p className="text-2xl font-black">{roleCounts.admin}</p>
            </div>
          </div>
        </Card>
        <Card variant="low">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center text-blue-600 font-black text-xs">R</div>
            <div>
              <p className="text-xs text-on-surface-variant/50">Recruiters</p>
              <p className="text-2xl font-black">{roleCounts.recruiter}</p>
            </div>
          </div>
        </Card>
        <Card variant="low">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center text-green-600 font-black text-xs">C</div>
            <div>
              <p className="text-xs text-on-surface-variant/50">Candidates</p>
              <p className="text-2xl font-black">{roleCounts.candidate}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-surface-container-low border-none rounded-lg px-4 py-3"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="recruiter">Recruiter</option>
          <option value="candidate">Candidate</option>
        </select>
      </Card>

      {/* Users List */}
      {isLoading ? (
        <Card variant="low" className="text-center py-12">Loading users...</Card>
      ) : filtered.length === 0 ? (
        <Card variant="low" className="text-center py-12">
          <Shield className="w-12 h-12 mx-auto mb-4 text-on-surface-variant/30" />
          <h3 className="text-lg font-bold mb-2">No users found</h3>
          <p className="text-on-surface-variant">
            {searchQuery || roleFilter ? 'Try adjusting your filters.' : 'Get started by adding your first user.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((user) => (
            <Card key={user.id} className="hover:bg-surface-container-low/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'recruiter' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {user.first_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold">{user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email}</p>
                    <p className="text-sm text-on-surface-variant/50">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold capitalize ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'recruiter' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold capitalize ${
                    user.status === 'active' ? 'bg-green-100 text-green-800' :
                    user.status === 'disabled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.status}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(user)} title="Edit user">
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleStatus(user)}
                    title={user.status === 'active' ? 'Disable user' : 'Enable user'}
                  >
                    {user.status === 'active' ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteUser(user)}
                    title="Disable user"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <Card className="w-full max-w-md space-y-6">
            <h2 className="text-xl font-bold">{editingUser ? 'Edit User' : 'Create User'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant/50">First Name</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3"
                    required={!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant/50">Last Name</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3"
                    required={!editingUser}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-on-surface-variant/50">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3"
                  required
                  disabled={!!editingUser}
                />
              </div>
              {!editingUser && (
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant/50">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3"
                    required
                    minLength={6}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant/50">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3"
                  >
                    <option value="candidate">Candidate</option>
                    <option value="recruiter">Recruiter</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant/50">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="submit">{editingUser ? 'Update' : 'Create'}</Button>
                <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
