"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Search, Loader2, Trash2, Edit, ExternalLink, FileText, X, TrendingUp, CheckCircle, Clock, XCircle } from "lucide-react";

type Job = {
  id: string;
  title: string;
  company: string;
  url: string;
  description: string;
  location: string;
  status: string;
  dateApplied: string;
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Scraper State
  const [urlInput, setUrlInput] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");

  // Modals
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddManual, setShowAddManual] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Manual Add State
  const [manualForm, setManualForm] = useState({ title: "", company: "", url: "", description: "", location: "Remote" });
  const [editForm, setEditForm] = useState({ title: "", company: "", url: "", description: "", location: "" });

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

      // Whether scraping succeeded fully, partially, or failed — pre-fill the modal
      // so the user can review and fill in whatever is missing.
      setManualForm({
        title: data.title || "",
        company: data.company || "",
        url: urlInput,
        description: data.description || "",
        location: data.location || "Remote",
      });
      setUrlInput("");
      setShowAddManual(true);

      // If the API returned an error or very little data, show a soft warning
      if (!res.ok || !data.description || data.description.length < 50) {
        setScrapeError("Couldn't auto-fill all fields — the site may have blocked us. Please fill in the missing details below.");
      }
    } catch (error: any) {
      // Even on total failure, open the modal with just the URL
      setManualForm({ title: "", company: "", url: urlInput, description: "", location: "Remote" });
      setUrlInput("");
      setShowAddManual(true);
      setScrapeError("Scraping failed — please fill in the details manually.");
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
        setManualForm({ title: "", company: "", url: "", description: "", location: "Remote" });
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
      console.log("Updating job with:", editForm);
      const res = await fetch(`/api/jobs/${editingJob.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      console.log("Response status:", res.status);

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
      description: job.description,
      location: job.location || ""
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

  const stats = {
    total: jobs.length,
    interviewing: jobs.filter(j => j.status === "Interviewing").length,
    offers: jobs.filter(j => j.status === "Offer").length,
    rejected: jobs.filter(j => j.status === "Rejected").length,
    rejectionRate: jobs.length > 0 ? Math.round((jobs.filter(j => j.status === "Rejected").length / jobs.length) * 100) : 0
  };

  const filteredJobs = jobs.filter(job =>
    job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <div className="flex-between mb-4">
        <div>
          <h1 className="text-gradient" style={{ fontSize: "2.5rem", marginBottom: "8px" }}>Job Tracker Companion</h1>
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
            {isScraping ? <><Loader2 size={18} className="animate-spin" /> Scraping...</> : <><Search size={18} /> Auto-fill</>}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => { setManualForm({ title: "", company: "", url: "", description: "", location: "Remote" }); setShowAddManual(true); }}>
            <Plus size={18} /> Manual Entry
          </button>
        </form>
        {scrapeError && <p className="mt-2" style={{ color: "var(--warning)", fontSize: "0.9rem" }}>{scrapeError}</p>}
      </div>

      {/* Stats Section */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "rgba(138, 43, 226, 0.2)", padding: "12px", borderRadius: "12px", color: "var(--primary)" }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: "0.9rem", margin: 0 }}>Total Applications</p>
            <h3 style={{ fontSize: "1.5rem", margin: 0 }}>{stats.total}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "rgba(26, 163, 255, 0.2)", padding: "12px", borderRadius: "12px", color: "var(--info)" }}>
            <Clock size={24} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: "0.9rem", margin: 0 }}>Interviewing</p>
            <h3 style={{ fontSize: "1.5rem", margin: 0 }}>{stats.interviewing}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "rgba(46, 213, 115, 0.2)", padding: "12px", borderRadius: "12px", color: "var(--success)" }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: "0.9rem", margin: 0 }}>Offers Received</p>
            <h3 style={{ fontSize: "1.5rem", margin: 0 }}>{stats.offers}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "rgba(255, 71, 87, 0.2)", padding: "12px", borderRadius: "12px", color: "var(--danger)" }}>
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: "0.9rem", margin: 0 }}>Rejection Rate</p>
            <h3 style={{ fontSize: "1.5rem", margin: 0 }}>{stats.rejectionRate}%</h3>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "0", overflow: "hidden", marginTop: "24px", borderRadius: "0" }}>
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--glass-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          boxSizing: "border-box"
        }}>
          <h2 className="text-gradient" style={{ fontSize: "1.8rem", margin: 0, fontWeight: "600" }}>Applications</h2>
          <div style={{ position: "relative", flex: "0 1 300px", minWidth: 0 }}>
            <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#a0a0b0" }} />
            <input
              type="text"
              placeholder="Search by company, role..."
              className="form-control"
              style={{ width: "100%", paddingLeft: "42px", height: "40px", fontSize: "0.95rem" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="job-table-container" style={{ borderRadius: "0 !important", border: "none" }}>
          <table className="job-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Location</th>
                <th>Status</th>
                <th>Applied Date</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto", color: "var(--primary)" }} />
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    {searchQuery ? "No jobs match your search." : "No job applications found. Start by adding one!"}
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 500 }}>{job.company || "Unknown Company"}</td>
                    <td>{job.title || "Unknown Role"}</td>
                    <td style={{ color: "#a0a0b0" }}>{job.location || "Remote"}</td>
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
                <h3 style={{ margin: 0 }}>{selectedJob?.title}</h3>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px" }}>
                  <p className="text-muted" style={{ margin: 0 }}>{selectedJob?.company}</p>
                  <span style={{ color: "var(--glass-border)", fontSize: "0.8rem" }}>|</span>
                  <p className="text-muted" style={{ margin: 0, color: "var(--info)" }}>{selectedJob?.location || "Remote"}</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedJob(null)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="desc-text formatted-content">{selectedJob?.description}</div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {showAddManual && (
        <div className="modal-overlay" onClick={() => { setShowAddManual(false); setScrapeError(""); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Add Job</h3>
              <button className="close-btn" onClick={() => { setShowAddManual(false); setScrapeError(""); }}><X size={24} /></button>
            </div>
            {scrapeError && (
              <div style={{ padding: "12px 24px", background: "rgba(255, 165, 2, 0.1)", borderBottom: "1px solid rgba(255, 165, 2, 0.3)", color: "var(--warning)", fontSize: "0.875rem" }}>
                ⚠️ {scrapeError}
              </div>
            )}
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
                  <label>Location</label>
                  <input type="text" className="form-control" placeholder="e.g. New York, SF, Remote" value={manualForm.location} onChange={e => setManualForm({ ...manualForm, location: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Full Job Description Text</label>
                  <textarea className="form-control" rows={8} required value={manualForm.description} onChange={e => setManualForm({ ...manualForm, description: e.target.value })}></textarea>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowAddManual(false); setScrapeError(""); }}>Cancel</button>
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
                  <label>Location</label>
                  <input type="text" className="form-control" value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
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
