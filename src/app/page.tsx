"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Search, Loader2, Trash2, Edit, ExternalLink, FileText, X } from "lucide-react";

type Job = {
  id: string;
  title: string;
  company: string;
  url: string;
  description: string;
  status: string;
  dateApplied: string;
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Scraper State
  const [urlInput, setUrlInput] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");

  // Modals
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddManual, setShowAddManual] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Manual Add State
  const [manualForm, setManualForm] = useState({ title: "", company: "", url: "", description: "" });
  const [editForm, setEditForm] = useState({ title: "", company: "", url: "", description: "" });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchJobs();
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <Loader2 size={48} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!session) return null;

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (error) {
      console.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;

    setIsScraping(true);
    setScrapeError("");

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse job");
      }

      if (!data.description || data.description.length < 50) {
        throw new Error("Could not find job description text. Most likely the site blocked us. Try manual entry.");
      }

      const saveRes = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (saveRes.ok) {
        setUrlInput("");
        fetchJobs();
      } else {
        throw new Error("Failed to save to database");
      }
    } catch (error: any) {
      setScrapeError(error.message);
    } finally {
      setIsScraping(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualForm),
      });

      if (res.ok) {
        setShowAddManual(false);
        setManualForm({ title: "", company: "", url: "", description: "" });
        fetchJobs();
      }
    } catch (error) {
      console.error("Failed to add manual job");
    }
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    try {
      const res = await fetch(`/api/jobs/${editingJob.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setEditingJob(null);
        fetchJobs();
      }
    } catch (error) {
      console.error("Failed to update job");
    }
  };

  const startEditing = (job: Job) => {
    setEditingJob(job);
    setEditForm({
      title: job.title,
      company: job.company,
      url: job.url,
      description: job.description
    });
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchJobs();
    } catch (error) {
      console.error("Failed to update status");
    }
  };

  const deleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    try {
      await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      fetchJobs();
    } catch (error) {
      console.error("Failed to delete job");
    }
  };

  const statusClassPicker = (status: string) => {
    switch (status.toLowerCase()) {
      case "applied": return "status-applied";
      case "interviewing": return "status-interviewing";
      case "offer": return "status-offer";
      case "rejected": return "status-rejected";
      default: return "status-applied";
    }
  };

  return (
    <>
      <div className="flex-between mb-4">
        <div>
          <h1 className="text-gradient" style={{ fontSize: "2.5rem", marginBottom: "8px" }}>Job Search Companion</h1>
          <p className="text-muted">Track your applications and never lose a job description again.</p>
        </div>
      </div>

      {/* Scraper Card */}
      <div className="glass-panel mb-4">
        <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>Add New Job</h2>
        <form onSubmit={handleScrape} className="flex-between gap-4">
          <input
            type="url"
            className="form-control"
            style={{ flex: 1 }}
            placeholder="Paste Job Posting URL here... (e.g. Greenhouse, Lever, Workday)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={isScraping}
            required
          />
          <button type="submit" className="btn" disabled={isScraping || !urlInput}>
            {isScraping ? <><Loader2 size={18} className="animate-spin" /> Scraping...</> : <><Search size={18} /> Auto-fill & Save</>}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setShowAddManual(true)}>
            <Plus size={18} /> Manual Entry
          </button>
        </form>
        {scrapeError && <p className="mt-2 text-danger" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{scrapeError}</p>}
      </div>

      {/* Jobs Table */}
      <div className="glass-panel" style={{ padding: "0" }}>
        <div className="job-table-container">
          <table className="job-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th>Applied Date</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px" }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto", color: "var(--primary)" }} />
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#808090" }}>
                    No jobs tracked yet. Paste a link above to get started!
                  </td>
                </tr>
              ) : (
                jobs.map(job => (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 500 }}>{job.company || "Unknown Company"}</td>
                    <td>{job.title || "Unknown Role"}</td>
                    <td>
                      <select
                        className={`form-control status-badge ${statusClassPicker(job.status)}`}
                        style={{ padding: "4px 8px", cursor: "pointer", border: "none", width: "auto" }}
                        value={job.status}
                        onChange={(e) => updateStatus(job.id, e.target.value)}
                      >
                        <option value="Applied">Applied</option>
                        <option value="Interviewing">Interviewing</option>
                        <option value="Offer">Offer</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="text-muted" style={{ fontSize: "0.9rem" }}>
                      {new Date(job.dateApplied).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: "6px" }} title="Original Link">
                          <ExternalLink size={16} />
                        </a>
                        <button onClick={() => setSelectedJob(job)} className="btn btn-secondary" style={{ padding: "6px" }} title="View Description">
                          <FileText size={16} />
                        </button>
                        <button onClick={() => startEditing(job)} className="btn btn-secondary" style={{ padding: "6px" }} title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => deleteJob(job.id)} className="btn btn-danger" style={{ padding: "6px" }} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Description Modal */}
      {selectedJob && (
        <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{selectedJob.title}</h3>
                <p className="text-muted" style={{ margin: "4px 0 0" }}>{selectedJob.company}</p>
              </div>
              <button className="close-btn" onClick={() => setSelectedJob(null)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="desc-text formatted-content">{selectedJob.description}</div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {showAddManual && (
        <div className="modal-overlay" onClick={() => setShowAddManual(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Manually Add Job</h3>
              <button className="close-btn" onClick={() => setShowAddManual(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleManualAdd}>
                <div className="form-group">
                  <label>Company</label>
                  <input type="text" className="form-control" required value={manualForm.company} onChange={e => setManualForm({ ...manualForm, company: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Job Title</label>
                  <input type="text" className="form-control" required value={manualForm.title} onChange={e => setManualForm({ ...manualForm, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>URL (Optional)</label>
                  <input type="url" className="form-control" value={manualForm.url} onChange={e => setManualForm({ ...manualForm, url: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Full Job Description Text</label>
                  <textarea className="form-control" rows={8} required value={manualForm.description} onChange={e => setManualForm({ ...manualForm, description: e.target.value })}></textarea>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddManual(false)}>Cancel</button>
                  <button type="submit" className="btn">Save Job</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {editingJob && (
        <div className="modal-overlay" onClick={() => setEditingJob(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Edit Job Entry</h3>
              <button className="close-btn" onClick={() => setEditingJob(null)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateJob}>
                <div className="form-group">
                  <label>Company</label>
                  <input type="text" className="form-control" required value={editForm.company} onChange={e => setEditForm({ ...editForm, company: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Job Title</label>
                  <input type="text" className="form-control" required value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>URL</label>
                  <input type="url" className="form-control" value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Full Job Description</label>
                  <textarea className="form-control" rows={12} required value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}></textarea>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingJob(null)}>Cancel</button>
                  <button type="submit" className="btn">Update Job</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
