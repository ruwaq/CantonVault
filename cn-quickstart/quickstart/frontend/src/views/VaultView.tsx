import React, { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '../stores/userStore';
import { useToast } from '../stores/toastStore';
import axios from 'axios';

const API = axios.create({ baseURL: '/api/vault' });

type Proposal = any;
type Commitment = any;
type Receipt = any;

type Quadrant = 'proposals' | 'commitments' | 'disputes' | 'receipts';

const VaultView: React.FC = () => {
  const { user, fetchUser } = useUserStore();
  const toast = useToast();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [activeQuadrant, setActiveQuadrant] = useState<Quadrant>('proposals');
  const [loading, setLoading] = useState(false);

  // ── Form state ──
  const [form, setForm] = useState({
    accepter: '', thirdParty: '', amount: '', currency: 'CC',
    description: '', workflow: 'supply-chain-finance', deadlineSeconds: '3600'
  });

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, r] = await Promise.allSettled([
        API.get('/proposals'),
        API.get('/commitments'),
        API.get('/receipts'),
      ]);
      if (p.status === 'fulfilled') setProposals(p.value.data);
      if (c.status === 'fulfilled') setCommitments(c.value.data);
      if (r.status === 'fulfilled') setReceipts(r.value.data);
    } catch {
      // silently ignore - user may not be authenticated
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUser(); refreshAll(); }, [fetchUser, refreshAll]);

  const createProposal = async () => {
    try {
      await API.post('/proposals', {
        ...form, amount: parseFloat(form.amount),
        deadlineSeconds: parseInt(form.deadlineSeconds)
      });
      toast.displaySuccess('Proposal created');
      setForm(f => ({ ...f, description: '', amount: '' }));
      refreshAll();
    } catch (e: any) {
      toast.displayError(e?.response?.data?.message || 'Failed to create proposal');
    }
  };

  const accept = async (id: string) => {
    try { await API.post(`/proposals/${id}/accept`); refreshAll(); toast.displaySuccess('Accepted'); }
    catch { toast.displayError('Accept failed'); }
  };

  const reject = async (id: string) => {
    try { await API.post(`/proposals/${id}/reject`); refreshAll(); toast.displaySuccess('Rejected'); }
    catch { toast.displayError('Reject failed'); }
  };

  const fulfill = async (id: string) => {
    try { await API.post(`/commitments/${id}/fulfill`, { fulfillmentNote: 'Fulfilled' }); refreshAll(); toast.displaySuccess('Fulfilled'); }
    catch { toast.displayError('Fulfill failed'); }
  };

  const dispute = async (id: string) => {
    try { await API.post(`/commitments/${id}/raise-dispute`, { reason: 'Dispute raised' }); refreshAll(); toast.displaySuccess('Dispute raised'); }
    catch { toast.displayError('Dispute failed'); }
  };

  const refund = async (id: string) => {
    try { await API.post(`/commitments/${id}/refund`); refreshAll(); toast.displaySuccess('Refunded'); }
    catch { toast.displayError('Refund failed'); }
  };

  const qLabel: Record<Quadrant, string> = {
    proposals: 'Proposals', commitments: 'Commitments', disputes: 'Privacy Map', receipts: 'Settlement Receipts'
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>CantonVault</h2>
        <span className="badge bg-success">Selective Disclosure Protocol</span>
      </div>

      {/* ── Quadrant tabs ── */}
      <ul className="nav nav-tabs mb-3">
        {(['proposals', 'commitments', 'disputes', 'receipts'] as Quadrant[]).map(q => (
          <li className="nav-item" key={q}>
            <button className={`nav-link ${activeQuadrant === q ? 'active' : ''}`} onClick={() => setActiveQuadrant(q)}>
              {qLabel[q]}
              {q === 'proposals' && proposals.length > 0 && <span className="badge bg-primary ms-1">{proposals.length}</span>}
              {q === 'commitments' && commitments.length > 0 && <span className="badge bg-warning ms-1">{commitments.length}</span>}
              {q === 'receipts' && receipts.length > 0 && <span className="badge bg-success ms-1">{receipts.length}</span>}
            </button>
          </li>
        ))}
        <li className="nav-item ms-auto">
          <button className="btn btn-sm btn-outline-secondary" onClick={refreshAll} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </li>
      </ul>

      {/* ── Q1: Proposals ── */}
      {activeQuadrant === 'proposals' && (
        <div className="row">
          <div className="col-md-5">
            <div className="card">
              <div className="card-header fw-bold">New Proposal</div>
              <div className="card-body">
                <div className="mb-2"><label className="form-label small">Accepter Party</label>
                  <input className="form-control form-control-sm" value={form.accepter} onChange={e => setForm({...form, accepter: e.target.value})} placeholder="Party ID" />
                </div>
                <div className="mb-2"><label className="form-label small">Third Party (observer)</label>
                  <input className="form-control form-control-sm" value={form.thirdParty} onChange={e => setForm({...form, thirdParty: e.target.value})} placeholder="Party ID" />
                </div>
                <div className="row mb-2">
                  <div className="col-6"><label className="form-label small">Amount (CC)</label>
                    <input className="form-control form-control-sm" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                  </div>
                  <div className="col-6"><label className="form-label small">Currency</label>
                    <input className="form-control form-control-sm" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} />
                  </div>
                </div>
                <div className="mb-2"><label className="form-label small">Description</label>
                  <input className="form-control form-control-sm" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="INV-2026-001" />
                </div>
                <div className="mb-2"><label className="form-label small">Workflow</label>
                  <select className="form-select form-select-sm" value={form.workflow} onChange={e => setForm({...form, workflow: e.target.value})}>
                    <option value="supply-chain-finance">Supply Chain Finance</option>
                    <option value="invoice-financing">Invoice Financing</option>
                    <option value="otc-block-trade">OTC Block Trade</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm w-100" onClick={createProposal}>Submit Proposal</button>
              </div>
            </div>
          </div>
          <div className="col-md-7">
            <h6>Active Proposals ({proposals.length})</h6>
            {proposals.length === 0 && <div className="text-muted small">No proposals yet</div>}
            {proposals.map((p: any) => (
              <div key={p.contractId || p.getProposer?.party} className="card mb-2">
                <div className="card-body py-2 px-3">
                  <div className="d-flex justify-content-between">
                    <div>
                      <strong>{p.getDescription || p.description}</strong>
                      <br /><small>{p.getAmount || p.amount} {p.getCurrency || p.currency}</small>
                      <span className="badge bg-info ms-2">{p.getWorkflow || p.workflow}</span>
                    </div>
                    <div className="d-flex gap-1 align-items-center">
                      <span className="badge bg-secondary small me-1">Pending</span>
                      <button className="btn btn-success btn-sm" onClick={() => accept(p.contractId)}>Accept</button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => reject(p.contractId)}>Reject</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Q2: Commitments ── */}
      {activeQuadrant === 'commitments' && (
        <div>
          <h6>Active Commitments ({commitments.length})</h6>
          {commitments.length === 0 && <div className="text-muted small">No active commitments</div>}
          {commitments.map((c: any) => (
            <div key={c.contractId || c.getDescription} className="card mb-2">
              <div className="card-body py-2 px-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{c.getDescription || c.description}</strong>
                    <br /><small>{c.getAmount || c.amount} {c.getCurrency || c.currency}</small>
                    <span className={`badge ms-2 ${(c.getStatus || c.status) === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                      {c.getStatus || c.status || 'Active'}
                    </span>
                  </div>
                  <div className="d-flex gap-1">
                    <button className="btn btn-primary btn-sm" onClick={() => fulfill(c.contractId)}>Fulfill</button>
                    <button className="btn btn-warning btn-sm" onClick={() => dispute(c.contractId)}>Dispute</button>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => refund(c.contractId)}>Refund</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Q3: Privacy Map / Disputes ── */}
      {activeQuadrant === 'disputes' && (
        <div className="row">
          <div className="col-md-6">
            <div className="card border-warning">
              <div className="card-header bg-warning bg-opacity-10 fw-bold">Privacy Model</div>
              <div className="card-body small">
                <table className="table table-sm table-borderless mb-0">
                  <thead><tr><th>Party Role</th><th>Sees Proposal</th><th>Sees Contract</th><th>Sees Receipt</th></tr></thead>
                  <tbody>
                    <tr><td>Proposer</td><td className="text-success">Full</td><td className="text-success">Full</td><td className="text-success">Full</td></tr>
                    <tr><td>Accepter</td><td className="text-success">Full</td><td className="text-success">Full</td><td className="text-success">Full</td></tr>
                    <tr><td>Third Party</td><td className="text-danger">None</td><td className="text-danger">None</td><td className="text-danger">None</td></tr>
                    <tr><td>Competitors</td><td className="text-danger">None</td><td className="text-danger">None</td><td className="text-danger">None</td></tr>
                    <tr><td>After Dispute</td><td>-</td><td>-</td><td className="text-warning">Selective</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-header fw-bold">Disclosure</div>
              <div className="card-body small">
                <p>The <strong>Disclosable</strong> interface enables on-demand selective disclosure:</p>
                <ol>
                  <li>Third party sees <strong>nothing</strong> by default</li>
                  <li><code>RaiseDispute</code> → creates <code>DisputeCase</code> with third party as <strong>observer</strong></li>
                  <li>Only <strong>amount + description</strong> revealed to third party</li>
                  <li><code>ResolveDispute</code> → dispute archived, contract proceeds</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Q4: Settlement Receipts ── */}
      {activeQuadrant === 'receipts' && (
        <div>
          <h6>Settlement Receipts ({receipts.length})</h6>
          {receipts.length === 0 && <div className="text-muted small">No receipts yet — fulfill a commitment to create one</div>}
          {receipts.map((r: any) => (
            <div key={r.contractId || `${r.getProposer?.party}-${r.getTimestamp}`} className="card mb-2 border-success">
              <div className="card-body py-2 px-3">
                <div className="d-flex justify-content-between">
                  <div>
                    <strong>Settled: {r.getAmount || r.amount} {r.getCurrency || r.currency}</strong>
                    <br /><small className="text-muted">{new Date(r.getTimestamp || r.timestamp).toLocaleString()}</small>
                    {r.getNote && <span className="badge bg-light text-dark ms-2">{r.getNote}</span>}
                  </div>
                  <span className="badge bg-success h-50">Settled</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VaultView;