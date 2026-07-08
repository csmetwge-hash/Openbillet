'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell'
import {
  ArrowLeft, Upload, Save, UserPlus, Trash2, Mail,
  CheckCircle2, AlertCircle, Crown, Shield, Eye, Wrench, Download,
} from 'lucide-react';
import NotificationButton from '@/components/NotificationButton';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Brand settings
  const [brandName, setBrandName] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Team
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user' | 'worker'>('user');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteError, setInviteError] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUser(user);

    const [settingsRes, teamRes] = await Promise.all([
      supabase.from('account_settings').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('team_members').select('*').eq('owner_user_id', user.id).order('created_at', { ascending: false }),
    ]);

    if (settingsRes.data) {
      setBrandName(settingsRes.data.brand_name || '');
      setBrandLogoUrl(settingsRes.data.brand_logo_url || '');
      setNotificationEmail(settingsRes.data.notification_email || '');
    }

    setTeamMembers(teamRes.data || []);
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('account_settings').upsert({
      user_id: user.id,
      brand_name: brandName || null,
      brand_logo_url: brandLogoUrl || null,
      notification_email: notificationEmail || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingLogo(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/brand-logo.${ext}`;
    try {
      const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('brand-assets').getPublicUrl(path);
      setBrandLogoUrl(data.publicUrl);
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg('');
    setInviteError('');
    try {
      const res = await fetch('/api/invite-team-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteMsg(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      // Refresh team list
      const { data: teamRes } = await supabase.from('team_members').select('*').eq('owner_user_id', user.id).order('created_at', { ascending: false });
      setTeamMembers(teamRes || []);
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const removeTeamMember = async (id: string) => {
    if (!confirm('Remove this team member?')) return;
    await supabase.from('team_members').delete().eq('id', id);
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  };
  
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText: deleteConfirmText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await supabase.auth.signOut();
      router.push('/');
    } catch (err: any) {
      alert('Error deleting account: ' + err.message);
      setDeleting(false);
    }
  };

  const updateMemberRole = async (id: string, newRole: string) => {
    const { error } = await supabase.from('team_members').update({ role: newRole }).eq('id', id);
    if (!error) {
      setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m));
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-zinc-500" />;
    if (role === 'worker') return <Wrench className="w-3.5 h-3.5 text-zinc-500" />;
    return <Eye className="w-3.5 h-3.5 text-zinc-400" />;
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-zinc-400 border-t-black rounded-full animate-spin" />
    </div>
  );

  return (
    <AppShell>
    <div className="min-h-screen bg-zinc-50 font-sans antialiased">

      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')}
              className="p-2 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition cursor-pointer">
              <ArrowLeft className="w-4 h-4 text-zinc-600" />
            </button>
            <div>
              <h1 className="text-base font-black tracking-tight text-zinc-950">Settings</h1>
              <p className="text-[11px] text-zinc-500">{user?.email}</p>
            </div>
          </div>
          <button onClick={saveSettings} disabled={saving}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50">
            {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-24">

        {/* Brand */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-black text-zinc-900">Brand</h2>
          <p className="text-xs text-zinc-500 -mt-2">Shown to your customers in their portal.</p>

          {/* Logo */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Logo</label>
            <div className="flex items-center gap-4">
              {brandLogoUrl ? (
                <img src={brandLogoUrl} alt="Brand logo" className="h-14 w-14 rounded-xl object-cover border border-zinc-200" />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-zinc-400" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition cursor-pointer disabled:opacity-50">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingLogo ? 'Uploading...' : brandLogoUrl ? 'Change Logo' : 'Upload Logo'}
                </button>
                <p className="text-[10px] text-zinc-400">PNG, JPG. Recommended: square, at least 200×200px.</p>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
              </div>
            </div>
            {brandLogoUrl && (
              <div className="mt-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Logo URL</label>
                <input type="url" value={brandLogoUrl} onChange={e => setBrandLogoUrl(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-zinc-900 transition text-zinc-600" />
              </div>
            )}
          </div>

          {/* Brand name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Brand Name</label>
            <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
              placeholder="Your company or brand name"
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-black text-zinc-900">Notifications</h2>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Notification Email <span className="text-zinc-300 normal-case font-medium">optional</span>
            </label>
            <input type="email" value={notificationEmail} onChange={e => setNotificationEmail(e.target.value)}
              placeholder={user?.email}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
            <p className="text-[10px] text-zinc-400 mt-1">
              Override where client activity alerts are sent. Defaults to your login email.
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Push Notifications</p>
            <NotificationButton />
          </div>
        </div>

        {/* Team */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-black text-zinc-900">Team</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Invite others to access your workspace.</p>
          </div>

          {/* Invite form */}
          <form onSubmit={sendInvite} className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 min-w-0 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition" />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'admin' | 'user' | 'worker')}
                className="border border-zinc-200 rounded-xl px-3 py-3 text-sm bg-white font-medium text-zinc-700 focus:outline-none w-32 sm:w-28 shrink-0">
                <option value="user">Viewer</option>
                <option value="admin">Admin</option>
                <option value="worker">Worker</option>
              </select>
            </div>
            <button type="submit" disabled={inviting || !inviteEmail.trim()}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-zinc-700 transition cursor-pointer disabled:opacity-40">
              <UserPlus className="w-4 h-4" />
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
            {inviteMsg && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> {inviteMsg}
              </div>
            )}
            {inviteError && (
              <div className="flex items-center gap-2 text-xs text-red-500 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> {inviteError}
              </div>
            )}
          </form>

          {/* Role legend */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-50 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-xs font-bold text-zinc-700">Admin</span>
              </div>
              <p className="text-[10px] text-zinc-500">Full read/write access to all portals</p>
            </div>
            <div className="bg-zinc-50 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-bold text-zinc-700">Viewer</span>
              </div>
              <p className="text-[10px] text-zinc-500">Read-only access, cannot make changes</p>
            </div>
            <div className="bg-zinc-50 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs font-bold text-zinc-700">Field Worker</span>
              </div>
              <p className="text-[10px] text-zinc-500">Sees only their assigned jobs &amp; schedule</p>
            </div>
          </div>

          {/* Team list */}
          <div className="space-y-2">
            {/* Owner row */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-zinc-900 rounded-lg shrink-0">
                  <Crown className="w-3 h-3 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 truncate">{user?.email}</p>
                  <p className="text-[10px] text-zinc-400">Owner</p>
                </div>
              </div>
            </div>

            {teamMembers.map(member => (
              <div key={member.id} className="flex items-start justify-between gap-2 p-3 border border-zinc-100 rounded-xl">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="p-1.5 bg-zinc-100 rounded-lg shrink-0 mt-0.5">
                    {getRoleIcon(member.role)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-900 truncate">{member.member_email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.id, e.target.value)}
                        className="text-[10px] border border-zinc-200 rounded px-2 py-1.5 bg-white text-zinc-600 focus:outline-none cursor-pointer w-24 sm:w-20 shrink-0"
                      >
                        <option value="user">Viewer</option>
                        <option value="admin">Admin</option>
                        <option value="worker">Worker</option>
                      </select>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                        member.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {member.status === 'active' ? 'Active' : 'Invited'}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => removeTeamMember(member.id)}
                  className="p-1.5 text-zinc-300 hover:text-red-400 transition cursor-pointer rounded-lg hover:bg-red-50 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {teamMembers.length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-4">No team members yet.</p>
            )}
          </div>
        </div>

      {/* Data & Privacy */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-black text-zinc-900">Data &amp; Privacy</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Export or manage your account data.</p>
          </div>
          <a href="/api/export-data" download
            className="w-full flex items-center justify-center gap-2 border border-zinc-200 text-zinc-700 py-3 rounded-xl text-sm font-bold hover:bg-zinc-50 transition cursor-pointer">
            <Download className="w-4 h-4" /> Export My Data
          </a>
          <p className="text-[10px] text-zinc-400 -mt-2">
            Downloads a readable copy of your account, portals, milestones, messages, and team data.
          </p>
        </div>

        {/* Danger Zone */}
        <div className="bg-white border border-red-200 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-black text-red-600">Danger Zone</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Permanently delete your account and all associated data.</p>
          </div>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 py-3 rounded-xl text-sm font-bold hover:bg-red-50 transition cursor-pointer">
              <Trash2 className="w-4 h-4" /> Delete My Account
            </button>
          ) : (
            <div className="space-y-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs text-red-700 font-semibold leading-relaxed">
                This cannot be undone. All your client portals, milestones, messages, files, team members, and billing will be permanently deleted. Your data will no longer be recoverable once you confirm.
              </p>
              <p className="text-xs text-zinc-600">
                Type <span className="font-bold">DELETE</span> below to confirm.
              </p>
              <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full border border-red-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 transition" />
              <div className="flex gap-2">
                <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition cursor-pointer disabled:opacity-40">
                  {deleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="px-4 py-2.5 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
    </AppShell>
  );
}