import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Save } from 'lucide-react';
import { getOrganization, createOrganization, updateOrganization } from '../../services/organizationService';
import { orgStatusBadge, extractErrorMessage } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';

export default function OrgProfilePage() {
  const { user, refreshUser } = useAuth();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
    addressText: '',
  });

  const orgId = user?.organizationId;

  useEffect(() => {
    let cancelled = false;
    async function fetchOrg() {
      if (!orgId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getOrganization(orgId);
        if (cancelled) return;
        const orgData = data?.organization || data;
        setOrg(orgData);
        setForm({
          name: orgData?.name || '',
          description: orgData?.description || '',
          contactEmail: orgData?.contactEmail || '',
          contactPhone: orgData?.contactPhone || '',
          addressText: orgData?.addressText || '',
        });
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchOrg();
    return () => { cancelled = true; };
  }, [orgId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setSuccessMsg(null);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone?.trim() || undefined,
        addressText: form.addressText.trim(),
      };

      if (user?.organizationId) {
        const updated = await updateOrganization(user.organizationId, payload);
        const orgData = updated?.organization || updated;
        setOrg(orgData);
        setSuccessMsg('Organization profile updated successfully.');
      } else {
        const created = await createOrganization(payload);
        const orgData = created?.organization || created;
        setOrg(orgData);
        await refreshUser();
        setSuccessMsg('Organization created successfully! Awaiting administrator verification.');
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Organization Profile</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage your rescue organization’s details, contact channels, and verification status.
          </p>
        </div>
        {org?.verificationStatus && (
          <div className="text-right">
            <span className="text-xs text-slate-500 block mb-1">Status</span>
            <Badge variant={orgStatusBadge(org.verificationStatus)}>{org.verificationStatus}</Badge>
          </div>
        )}
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {loading ? (
        <div className="card flex items-center justify-center h-48">
          <Spinner size={28} />
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label" htmlFor="orgName">Organization Name *</label>
              <input
                id="orgName"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. City Harvest Food Pantry"
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="orgDesc">Description</label>
              <textarea
                id="orgDesc"
                name="description"
                rows="3"
                value={form.description}
                onChange={handleChange}
                placeholder="Mission statement, community served, operational hours..."
                className="form-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="contactEmail">Contact Email *</label>
                <input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={handleChange}
                  placeholder="contact@organization.org"
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="contactPhone">Contact Phone</label>
                <input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  value={form.contactPhone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="addressText">Headquarters / Depot Address *</label>
              <input
                id="addressText"
                name="addressText"
                type="text"
                value={form.addressText}
                onChange={handleChange}
                placeholder="789 Rescue Blvd, Suite 100, City, State"
                className="form-input"
                required
              />
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-surface-border">
              <span className="text-xs text-slate-500">
                {user?.organizationId ? `Org ID: ${user.organizationId}` : 'No organization registered yet.'}
              </span>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? <Spinner size={16} /> : <><Save size={16} /> Save Profile</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
