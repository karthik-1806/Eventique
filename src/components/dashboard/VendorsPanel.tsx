'use client';

import { useState, useEffect, useRef } from 'react';
import { useEventContext } from '@/context/EventContext';
import { formatCurrency } from '@/lib/engines/budget-engine';
import type { Vendor, VendorStatus } from '@/lib/models/types';
import { v4 as uuidv4 } from 'uuid';
import styles from './panels.module.css';

const STATUS_LABELS: Record<VendorStatus, string> = {
  researching: 'Researching',
  contacted: 'Contacted',
  booked: 'Booked',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

const STATUS_BADGE: Record<VendorStatus, string> = {
  researching: 'badge-muted',
  contacted: 'badge-info',
  booked: 'badge-warning',
  confirmed: 'badge-success',
  cancelled: 'badge-danger',
};

export default function VendorsPanel() {
  const { state, dispatch } = useEventContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | VendorStatus>('all');
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const closeModal = () => {
    setShowAddModal(false);
    setTimeout(() => triggerBtnRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (!showAddModal) return;

    // Auto-focus first input in modal
    const timer = setTimeout(() => {
      const firstInput = modalRef.current?.querySelector<HTMLElement>('input, button, select');
      firstInput?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAddModal]);
  const [newVendor, setNewVendor] = useState<Omit<Vendor, 'id' | 'eventId' | 'aiSuggested'>>({
    category: '',
    name: '',
    estimatedCost: 0,
    status: 'researching',
    contactInfo: '',
    deadline: '',
    notes: '',
  });

  const { currentPlan } = state;
  if (!currentPlan) return null;

  const { vendors, event } = currentPlan;

  const filtered = vendors.filter((v) => filterStatus === 'all' || v.status === filterStatus);

  // Group by category
  const grouped = filtered.reduce((acc, v) => {
    const cat = v.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(v);
    return acc;
  }, {} as Record<string, Vendor[]>);

  const handleStatusChange = (id: string, status: VendorStatus) => {
    dispatch({ type: 'UPDATE_VENDOR', payload: { id, status } });
  };

  const handleAddVendor = () => {
    if (!newVendor.category.trim()) return;
    dispatch({
      type: 'ADD_VENDOR',
      payload: {
        id: uuidv4(),
        eventId: event.id,
        ...newVendor,
        category: newVendor.category.trim(),
        name: newVendor.name.trim(),
        notes: newVendor.notes.trim(),
        aiSuggested: false,
      },
    });
    closeModal();
    setNewVendor({ category: '', name: '', estimatedCost: 0, status: 'researching', contactInfo: '', deadline: '', notes: '' });
  };

  const confirmedCount = vendors.filter((v) => v.status === 'confirmed' || v.status === 'booked').length;
  const totalEstimated = vendors.reduce((sum, v) => sum + v.estimatedCost, 0);

  return (
    <section className={styles.panel} aria-labelledby="vendors-heading">
      <div className={styles.panelHeader}>
        <h2 id="vendors-heading" className={styles.panelTitle}>Vendor Tracker</h2>
        <button
          id="add-vendor-btn"
          ref={triggerBtnRef}
          className="btn btn-primary btn-sm"
          onClick={() => setShowAddModal(true)}
          aria-label="Add new vendor"
        >
          + Add Vendor
        </button>
      </div>

      {/* Summary */}
      <div className={styles.kpiGrid}>
        <div className="stat-card">
          <div className="stat-label">Total Vendors</div>
          <div className="stat-value">{vendors.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Confirmed / Booked</div>
          <div className="stat-value text-success">{confirmedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Est. Total Cost</div>
          <div className="stat-value">{formatCurrency(totalEstimated, event.currency)}</div>
        </div>
      </div>

      {/* Vendor Readiness Strip */}
      {vendors.length > 0 && (
        <div className={styles.vendorReadinessList} role="region" aria-label="Vendor Readiness Overview">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
            VENDOR READINESS STATUS
          </div>
          {vendors.slice(0, 5).map((v) => {
            const isConfirmed = v.status === 'confirmed' || v.status === 'booked';
            const isContacted = v.status === 'contacted';
            return (
              <div key={v.id} className={styles.vendorReadinessItem}>
                <div className={styles.vendorReadinessCat}>
                  <span style={{ color: isConfirmed ? 'var(--color-success)' : isContacted ? 'var(--color-warning)' : 'var(--color-text-muted)', fontWeight: 700 }}>
                    {isConfirmed ? '✓' : isContacted ? '⚠' : '○'}
                  </span>
                  <span>{v.category || v.name || 'Vendor'}</span>
                  {v.name && v.name !== v.category && (
                    <span className="text-xs text-muted">({v.name})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${STATUS_BADGE[v.status]}`}>
                    {STATUS_LABELS[v.status]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter */}
      <div className={styles.filterBar} role="group" aria-label="Filter vendors by status">
        {(['all', 'researching', 'contacted', 'booked', 'confirmed', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            className={`${styles.filterChip} ${filterStatus === s ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus(s)}
            aria-pressed={filterStatus === s}
          >
            {s === 'all' ? `All (${vendors.length})` : STATUS_LABELS[s as VendorStatus]}
          </button>
        ))}
      </div>

      {/* Vendor list by category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">🏪</div>
          <div className="empty-state-title">No vendors yet</div>
          <div className="empty-state-desc">Add vendors manually or generate an AI plan to get vendor suggestions</div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>Add First Vendor</button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([category, catVendors]) => (
            <div key={category} className={styles.section}>
              <h3 className={styles.sectionTitle}>{category}</h3>
              <div className={styles.vendorGrid}>
                {catVendors.map((vendor) => (
                  <div key={vendor.id} className={styles.vendorCard}>
                    <div className={styles.vendorHeader}>
                      <div>
                        <div className={styles.vendorCategory}>{vendor.category}</div>
                        <div className={styles.vendorName}>
                          {vendor.name || <span className="text-muted">Name TBD</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {vendor.aiSuggested && (
                          <span className="ai-badge">
                            <span className="ai-pulse" aria-hidden="true" />
                            AI
                          </span>
                        )}
                        <span className={`badge ${STATUS_BADGE[vendor.status]}`}>
                          {STATUS_LABELS[vendor.status]}
                        </span>
                      </div>
                    </div>

                    {vendor.estimatedCost > 0 && (
                      <div className={styles.vendorCost}>
                        Est: {formatCurrency(vendor.estimatedCost, event.currency)}
                      </div>
                    )}

                    {vendor.notes && (
                      <div className="text-xs text-muted">{vendor.notes.slice(0, 120)}</div>
                    )}

                    {vendor.contactInfo && (
                      <div className="text-xs text-secondary">📞 {vendor.contactInfo}</div>
                    )}

                    <div className={styles.vendorActions}>
                      {(['researching', 'contacted', 'booked', 'confirmed', 'cancelled'] as VendorStatus[]).map((s) => (
                        s !== vendor.status && (
                          <button
                            key={s}
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleStatusChange(vendor.id, s)}
                            aria-label={`Mark ${vendor.name || vendor.category} as ${STATUS_LABELS[s]}`}
                          >
                            → {STATUS_LABELS[s]}
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-vendor-modal-title">
          <div className="modal-content" ref={modalRef}>
            <div className="modal-header">
              <h3 id="add-vendor-modal-title">Add Vendor</h3>
              <button className="modal-close" onClick={closeModal} aria-label="Close modal">✕</button>
            </div>

            <div className={styles.modalForm}>
              <div className="form-group">
                <label htmlFor="vendor-category">Category <span aria-hidden="true">*</span></label>
                <input
                  id="vendor-category"
                  type="text"
                  placeholder="e.g. Venue, Catering, Photography"
                  value={newVendor.category}
                  onChange={(e) => setNewVendor((v) => ({ ...v, category: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="vendor-name">Vendor Name</label>
                <input
                  id="vendor-name"
                  type="text"
                  placeholder="Company or person name"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor((v) => ({ ...v, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="vendor-cost">Estimated Cost ({event.currency})</label>
                <input
                  id="vendor-cost"
                  type="number"
                  value={newVendor.estimatedCost}
                  min={0}
                  onChange={(e) => setNewVendor((v) => ({ ...v, estimatedCost: Number(e.target.value) }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="vendor-status">Status</label>
                <select
                  id="vendor-status"
                  value={newVendor.status}
                  onChange={(e) => setNewVendor((v) => ({ ...v, status: e.target.value as VendorStatus }))}
                >
                  {(['researching', 'contacted', 'booked', 'confirmed'] as VendorStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="vendor-contact">Contact Info</label>
                <input
                  id="vendor-contact"
                  type="text"
                  placeholder="Phone or email"
                  value={newVendor.contactInfo}
                  onChange={(e) => setNewVendor((v) => ({ ...v, contactInfo: e.target.value }))}
                  maxLength={200}
                />
              </div>
              <div className="form-group">
                <label htmlFor="vendor-notes">Notes</label>
                <textarea
                  id="vendor-notes"
                  placeholder="Any relevant notes..."
                  value={newVendor.notes}
                  onChange={(e) => setNewVendor((v) => ({ ...v, notes: e.target.value }))}
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="flex gap-3 justify-end border-top">
                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button
                  id="save-vendor-btn"
                  className="btn btn-primary"
                  onClick={handleAddVendor}
                  disabled={!newVendor.category.trim()}
                >
                  Add Vendor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
