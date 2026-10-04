import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, RefreshCw, Building2, UserCheck } from 'lucide-react';
import { getPendingVerifications, verifyUser, verifyOrganization } from '../../services/adminService';
import { formatDate, extractErrorMessage } from '../../utils/formatters';
import Spinner from '../../components/common/Spinner';
import Alert from '../../components/common/Alert';

export default function AdminVerificationsPage() {
  const [data, setData] = useState({ users: [], organizations: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPendingVerifications();
      setData({
        users: res?.users || [],
        organizations: res?.organizations || [],
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleVerifyUser = async (userId, status) => {
    setActionLoading(`user-${userId}`);
    setError(null);
    try {
      await verifyUser(userId, status);
      setSuccessMsg(`User status updated to ${status}.`);
      fetchVerifications();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyOrg = async (orgId, status) => {
    setActionLoading(`org-${orgId}`);
    setError(null);
    try {
      await verifyOrganization(orgId, status);
      setSuccessMsg(`Organization status updated to ${status}.`);
      fetchVerifications();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const pendingUsers = data.users || [];
  const pendingOrgs = data.organizations || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Trust & Verifications Queue</h2>
          <p className="text-sm text-slate-400 mt-1">
            Review identity and organization registrations before granting platform operation permissions.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchVerifications}
          title="Refresh Queue"
          className="btn-secondary px-3 py-2"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Pending Organizations Queue */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-brand-400" />
          <h3 className="section-title">Pending Organizations ({pendingOrgs.length})</h3>
        </div>

        {loading && pendingOrgs.length === 0 ? (
          <div className="card py-8 flex justify-center"><Spinner size={24} /></div>
        ) : pendingOrgs.length === 0 ? (
          <div className="card text-center py-6 text-slate-500 text-xs">
            No organizations currently awaiting verification.
          </div>
        ) : (
          <div className="overflow-x-auto card p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Contact Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrgs.map((org) => (
                  <tr key={org._id}>
                    <td>
                      <span className="font-semibold text-slate-100 block">{org.name}</span>
                      <span className="text-xs text-slate-500 line-clamp-1">{org.description || 'No description'}</span>
                    </td>
                    <td className="text-xs text-slate-300">{org.contactEmail}</td>
                    <td className="text-xs text-slate-400">{org.contactPhone || '—'}</td>
                    <td className="text-xs text-slate-400 max-w-xs truncate">{org.addressText}</td>
                    <td className="text-xs text-slate-500">{formatDate(org.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerifyOrg(org._id, 'VERIFIED')}
                          disabled={actionLoading === `org-${org._id}`}
                          className="btn-primary text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500"
                        >
                          {actionLoading === `org-${org._id}` ? <Spinner size={12} /> : <><CheckCircle2 size={13} /> Approve</>}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyOrg(org._id, 'REJECTED')}
                          disabled={actionLoading === `org-${org._id}`}
                          className="btn-secondary text-xs py-1 px-2 text-red-400 hover:text-red-300"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Users Queue */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck size={18} className="text-blue-400" />
          <h3 className="section-title">Pending Users ({pendingUsers.length})</h3>
        </div>

        {loading && pendingUsers.length === 0 ? (
          <div className="card py-8 flex justify-center"><Spinner size={24} /></div>
        ) : pendingUsers.length === 0 ? (
          <div className="card text-center py-6 text-slate-500 text-xs">
            No users currently awaiting verification.
          </div>
        ) : (
          <div className="overflow-x-auto card p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u) => (
                  <tr key={u._id}>
                    <td className="font-semibold text-slate-100">{u.name}</td>
                    <td className="text-xs text-slate-300">{u.email}</td>
                    <td>
                      <span className="badge badge-slate text-xs">{u.role}</span>
                    </td>
                    <td className="text-xs text-slate-400">{u.phone || '—'}</td>
                    <td className="text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerifyUser(u._id, 'ACTIVE')}
                          disabled={actionLoading === `user-${u._id}`}
                          className="btn-primary text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500"
                        >
                          {actionLoading === `user-${u._id}` ? <Spinner size={12} /> : <><CheckCircle2 size={13} /> Activate</>}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyUser(u._id, 'REJECTED')}
                          disabled={actionLoading === `user-${u._id}`}
                          className="btn-secondary text-xs py-1 px-2 text-red-400 hover:text-red-300"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
