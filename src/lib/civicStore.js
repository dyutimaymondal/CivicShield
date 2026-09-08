/**
 * CivicShield Unified Reactive Store & Intelligence Service
 * 
 * Bridges client state, Supabase database, and local persistence.
 * Implements:
 * - Real-time incident clustering & duplicate detection pipeline
 * - Dynamic priority calculation & audit logging
 * - Digital Micro-Protest transactional support recording & velocity tracking
 * - Pre-seeded realistic demo dataset (86 reports, 1,248+ verified supporters)
 */

import { supabase } from "./supabaseClient.js";
import {
  analyzeCivicReportAsync,
  calculateDynamicPriority,
  computeSemanticSimilarity,
  generatePublicDemandAsync
} from "./aiIntelligence.js";
import {
  microProtestService,
  MICRO_PROTEST_STATUS
} from "./microProtestService.js";
import { verificationService } from "./verificationService.js";

const STORAGE_KEY_INCIDENTS = "civicshield_incidents_v2";
const STORAGE_KEY_PROTESTS = "civicshield_protests_v2";
const STORAGE_KEY_SUPPORTS = "civicshield_supports_v2";
const STORAGE_KEY_AUDIT = "civicshield_audit_v2";
const STORAGE_KEY_REPORTS = "civicshield_reports_cache_v2";
const STORAGE_KEY_BROADCASTS = "civicshield_broadcasts_v2";

// Realistic Seed Dataset for Demo Scenario (PRD Section 41)
const SEED_INCIDENTS = [
  {
    id: "inc_seed_road_hazard",
    title: "Major Road Surface Fracture & Pothole Trench",
    description: "Deep multi-layer road crater cluster along the primary transit corridor causing vehicle damage, severe two-wheeler swerving, and morning congestion bottlenecks.",
    category: "Roads & Transportation",
    status: "IN_PROGRESS",
    severity: "High",
    priority: "P1 - Urgent Municipal Attention",
    priority_score: 0.820,
    priority_breakdown: {
      severity_score: 0.85,
      impact_score: 0.75,
      volume_score: 0.90,
      velocity_score: 0.88,
      confidence_score: 0.92,
      evidence_score: 0.80,
      final_priority: 0.820
    },
    location: "Sector 4 Arterial Highway, Near City Library Metro",
    latitude: 28.6139,
    longitude: 77.2090,
    count: 86,
    velocity_6h: 18,
    department: "Public Works Department (PWD)",
    official_response: "PWD Quick Response Crew #4 deployed on-site. Bituminous cold-patching commenced and safety hazard cones installed along the lane boundary.",
    ai_summary: "AI Assessment: Identified severe road surface damage with high risk of vehicular accidents and severe transit disruption. Dynamic priority evaluated at 0.820 (Urgent Municipal Attention).",
    first_reported_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    last_reported_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString()
  },
  {
    id: "inc_seed_sewage_flood",
    title: "Hazardous Industrial Sewage Overflow & Drainage Contamination",
    description: "Ruptured underground drainage conduit spilling contaminated biohazard waste onto public pedestrian walkways and market frontage with foul odor.",
    category: "Water Supply & Drainage",
    status: "VERIFIED",
    severity: "Critical",
    priority: "P0 - Emergency Dispatch",
    priority_score: 0.885,
    priority_breakdown: {
      severity_score: 1.00,
      impact_score: 0.85,
      volume_score: 0.80,
      velocity_score: 0.92,
      confidence_score: 0.95,
      evidence_score: 0.80,
      final_priority: 0.885
    },
    location: "4th Cross Road, Ward 12 Market Transit Corridor",
    latitude: 28.6210,
    longitude: 77.2150,
    count: 54,
    velocity_6h: 22,
    department: "Water Supply & Sewerage Board",
    official_response: "Sewerage engineer dispatch queued. Vacuum suction units scheduled for immediate emergency deployment.",
    ai_summary: "AI Assessment: Critical public health biohazard. Uncontrolled sewage overflow posing infectious vector spread. Emergency priority assigned.",
    first_reported_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    last_reported_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
  },
  {
    id: "inc_seed_power_hazard",
    title: "Exposed High-Voltage Cable Sparking Outside School District",
    description: "Severed elevated distribution wire hanging within 2 meters of the school boundary wall sparking intermittently during rain showers.",
    category: "Power & Electrical Grid",
    status: "ASSIGNED",
    severity: "Critical",
    priority: "P0 - Emergency Dispatch",
    priority_score: 0.790,
    priority_breakdown: {
      severity_score: 1.00,
      impact_score: 0.70,
      volume_score: 0.65,
      velocity_score: 0.75,
      confidence_score: 0.96,
      evidence_score: 0.60,
      final_priority: 0.790
    },
    location: "School Lane, Opposite Primary Academy Gate",
    latitude: 28.6080,
    longitude: 77.2020,
    count: 32,
    velocity_6h: 14,
    department: "Electricity & Grid Safety Board",
    official_response: "Emergency grid safety patrol dispatched to de-energize and ground damaged overhead distribution line.",
    ai_summary: "AI Assessment: High electrocution hazard directly adjacent to child pedestrian route. Immediate electrical circuit isolation recommended.",
    first_reported_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    last_reported_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString()
  }
];

const SEED_PROTESTS = [
  {
    id: "mp_inc_seed_road_hazard",
    incident_id: "inc_seed_road_hazard",
    title: "Demand Action: Major Road Surface Fracture & Pothole Trench",
    demand_text: "Immediately reconstruct and resurface the fractured roadway section near Sector 4 Arterial Highway, deploy immediate hazard barricades, and publish a binding public completion timeline.",
    description: "Verified citizen collective demand petition for road restoration. Powered by CivicShield Digital Micro-Protest protocol.",
    status: MICRO_PROTEST_STATUS.ACTIVE,
    eligibility_reason: "Verified public safety & municipal infrastructure concern.",
    target_authority: "Municipal Corporation",
    target_department: "Public Works Department (PWD)",
    support_count: 1248,
    unique_support_count: 1248,
    velocity_6h: 184,
    demand_provenance: {
      source: "CivicShield Neural Synthesis Core v2.4",
      confidence: 0.92,
      model: "Civic-Grounded-L1",
      generated_at: new Date().toISOString(),
      human_approved: true
    },
    starts_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    last_count_update: new Date().toISOString(),
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mp_inc_seed_sewage_flood",
    incident_id: "inc_seed_sewage_flood",
    title: "Demand Action: Hazardous Industrial Sewage Overflow",
    demand_text: "Dispatch specialized emergency drainage crews to clear sewage blockage near 4th Cross Road, remediate toxic standing water, and implement preventative culvert maintenance within 48 hours.",
    description: "Verified citizen collective demand petition for drainage sanitation.",
    status: MICRO_PROTEST_STATUS.ACTIVE,
    eligibility_reason: "Critical public health biohazard.",
    target_authority: "Municipal Corporation",
    target_department: "Water Supply & Sewerage Board",
    support_count: 892,
    unique_support_count: 892,
    velocity_6h: 95,
    demand_provenance: {
      source: "CivicShield Neural Synthesis Core v2.4",
      confidence: 0.95,
      model: "Civic-Grounded-L1",
      generated_at: new Date().toISOString(),
      human_approved: true
    },
    starts_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    last_count_update: new Date().toISOString(),
    created_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString()
  },
  {
    id: "mp_inc_seed_power_hazard",
    incident_id: "inc_seed_power_hazard",
    title: "Demand Action: Exposed High-Voltage Cable Sparking",
    demand_text: "De-energize and secure exposed live overhead cables near School Lane, repair damaged transformer shielding, and conduct a certified grid safety audit for the surrounding neighborhood.",
    description: "Verified citizen collective demand for electrical safety.",
    status: MICRO_PROTEST_STATUS.ACTIVE,
    eligibility_reason: "Immediate public electrocution hazard.",
    target_authority: "Municipal Corporation",
    target_department: "Electricity & Grid Safety Board",
    support_count: 460,
    unique_support_count: 460,
    velocity_6h: 72,
    demand_provenance: {
      source: "CivicShield Neural Synthesis Core v2.4",
      confidence: 0.96,
      model: "Civic-Grounded-L1",
      generated_at: new Date().toISOString(),
      human_approved: true
    },
    starts_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    last_count_update: new Date().toISOString(),
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
  }
];

const SEED_REPORTS = [
  {
    id: "rep_seed_road_1",
    incident_id: "inc_seed_road_hazard",
    user_id: "citizen_vikram_p",
    citizen_name: "Vikram Patel",
    citizen_email: "vikram.patel@gmail.com",
    title: "Massive Deep Crater Potholes along Sector 4 Metro Pillar 42",
    description: "Deep multi-layer road crater cluster along the primary transit corridor causing vehicle undercarriage damage and severe two-wheeler swerving during morning peak hours.",
    category: "Roads & Transportation",
    location: "Sector 4 Arterial Highway, Near Metro Pillar 42",
    photo_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
    status: "in_progress",
    severity: "High",
    priority: "P1 - Urgent Municipal Attention",
    priority_score: 0.82,
    government_verified: true,
    verified_by: "Er. Rajesh Sharma (Chief Municipal Engineer, PWD)",
    verified_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    verification_notes: "Field inspected by PWD Sub-Division 4. Structural road-base deformation confirmed.",
    official_announcement: "PWD Rapid Response Crew #4 deployed on-site. Bituminous cold-mix patch work in progress. Traffic rerouting cones placed.",
    department: "Public Works Department (PWD)",
    crew_assigned: "PWD Rapid Response Crew #4",
    eta: "Today by 5:30 PM",
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_seed_sewage_1",
    incident_id: "inc_seed_sewage_flood",
    user_id: "citizen_ananya_s",
    citizen_name: "Ananya Sen",
    citizen_email: "ananya.sen@outlook.com",
    title: "Hazardous Industrial Sewage Overflow at Ward 12 Market",
    description: "Ruptured underground conduit spilling foul toxic effluent onto pedestrian sidewalks directly outside market stalls. Urgent biohazard intervention required.",
    category: "Water Supply & Drainage",
    location: "4th Cross Road, Ward 12 Market Transit Corridor",
    photo_url: "https://images.unsplash.com/photo-1574958269340-fa927304f2dd?auto=format&fit=crop&w=800&q=80",
    status: "pending",
    severity: "Critical",
    priority: "P0 - Emergency Dispatch",
    priority_score: 0.885,
    government_verified: false,
    verified_by: null,
    verified_at: null,
    verification_notes: null,
    official_announcement: null,
    department: "Water Supply & Sewerage Board",
    crew_assigned: null,
    eta: "Pending Municipal Inspection",
    created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_seed_wire_1",
    incident_id: "inc_seed_power_hazard",
    user_id: "citizen_manish_k",
    citizen_name: "Manish Kumar",
    citizen_email: "manish.k@gmail.com",
    title: "Sparking Overhead 11kV Wire Snapped near School Boundary",
    description: "High tension distribution wire hanging within 2 meters of the school walking gate sparking intermittently during drizzle. Immediate electrocution risk.",
    category: "Power & Electrical Grid",
    location: "School Lane, Opposite Primary Academy Gate",
    photo_url: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=800&q=80",
    status: "pending",
    severity: "Critical",
    priority: "P0 - Emergency Dispatch",
    priority_score: 0.79,
    government_verified: true,
    verified_by: "Er. Rajesh Sharma (PWD / Grid Safety Liaison)",
    verified_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    verification_notes: "Priority dispatch submitted directly to State Power Grid substation.",
    official_announcement: "Emergency electrical patrol dispatched to isolate feeder and re-anchor aerial bundle cable.",
    department: "Electricity & Grid Safety Board",
    crew_assigned: "State Power Grid Safety Patrol #2",
    eta: "Within 45 minutes",
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_seed_waste_1",
    user_id: "citizen_priya_s",
    citizen_name: "Priya Sharma",
    citizen_email: "priya.sharma@gmail.com",
    title: "Commercial Solid Waste Dump Accumulating at Health Center Gate",
    description: "Massive pile of decomposing commercial waste and plastic refuse blocking access to public dispensary. Stray animals and health hazard.",
    category: "Solid Waste & Sanitation",
    location: "Ward 9 Dispensary Road, Junction 3",
    photo_url: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80",
    status: "pending",
    severity: "Medium",
    priority: "P2 - Standard Priority",
    priority_score: 0.52,
    government_verified: false,
    verified_by: null,
    verified_at: null,
    verification_notes: null,
    official_announcement: null,
    department: "Solid Waste Management & Sanitation",
    crew_assigned: null,
    eta: null,
    created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString()
  }
];

const SEED_BROADCASTS = [
  {
    id: "bc_seed_pwd_1",
    title: "Municipal Public Notice: Emergency Road & Drainage Works on Sector 4 Corridor",
    message: "Public Works Department crews are undertaking urgent bituminous road repairs and storm drain clearance on Sector 4 arterial road. Single lane closure in effect until 6:00 PM today. Traffic rerouting via Outer Ring Road.",
    department: "Public Works Department (PWD)",
    officer: "Er. Rajesh Sharma (Chief Municipal Engineer)",
    severity: "WARNING", // INFO | WARNING | EMERGENCY
    active: true,
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
  }
];

class CivicStore {
  constructor() {
    this.listeners = new Set();
    this.initStore();
  }

  initStore() {
    if (!localStorage.getItem(STORAGE_KEY_INCIDENTS)) {
      localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(SEED_INCIDENTS));
    }
    if (!localStorage.getItem(STORAGE_KEY_PROTESTS)) {
      localStorage.setItem(STORAGE_KEY_PROTESTS, JSON.stringify(SEED_PROTESTS));
    }
    if (!localStorage.getItem(STORAGE_KEY_SUPPORTS)) {
      localStorage.setItem(STORAGE_KEY_SUPPORTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEY_AUDIT)) {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEY_REPORTS)) {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(SEED_REPORTS));
    }
    if (!localStorage.getItem(STORAGE_KEY_BROADCASTS)) {
      localStorage.setItem(STORAGE_KEY_BROADCASTS, JSON.stringify(SEED_BROADCASTS));
    }
  }

  // Reactive listener subscriber
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error("CivicStore listener error:", err);
      }
    }
  }

  // --------------------------------------------------------------------------
  // REPORTS API (CITIZEN POSTS & GOVERNMENT VERIFICATION)
  // --------------------------------------------------------------------------
  getAllReports() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_REPORTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(SEED_REPORTS));
        return SEED_REPORTS;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(SEED_REPORTS));
        return SEED_REPORTS;
      }
      return parsed;
    } catch {
      return SEED_REPORTS;
    }
  }

  saveReports(reports) {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
    this.notify();
  }

  getUserReports(userId) {
    if (!userId) return [];
    const reports = this.getAllReports();
    return reports.filter((r) => r.user_id === userId);
  }

  async updateReport(reportId, updates = {}) {
    const reports = this.getAllReports();
    const index = reports.findIndex((r) => r.id === reportId);
    if (index === -1) return null;

    reports[index] = {
      ...reports[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.saveReports(reports);
    this.recordAuditEvent("REPORT", reportId, "GOVERNMENT_UPDATE", updates);

    // If linked to an incident, automatically sync official status and response
    if (reports[index].incident_id) {
      const incStatus = updates.status === "in_progress" 
        ? "IN_PROGRESS" 
        : updates.status === "resolved" 
        ? "RESOLVED" 
        : updates.status === "verified" 
        ? "VERIFIED" 
        : undefined;

      this.updateIncidentStatus(
        reports[index].incident_id,
        incStatus,
        updates.official_announcement || "",
        updates.department || ""
      );
    }

    // Parallel sync to Supabase reports table if available
    try {
      const supabaseUpdates = {};
      if (updates.status) supabaseUpdates.status = updates.status;
      if (updates.severity) supabaseUpdates.severity = updates.severity;
      if (updates.official_announcement) supabaseUpdates.ai_summary = updates.official_announcement;
      if (Object.keys(supabaseUpdates).length > 0) {
        await supabase.from("reports").update(supabaseUpdates).eq("id", reportId);
      }
    } catch {
      // background sync catch
    }

    return reports[index];
  }

  // --------------------------------------------------------------------------
  // BROADCAST ANNOUNCEMENTS API
  // --------------------------------------------------------------------------
  getBroadcastAnnouncements() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_BROADCASTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEY_BROADCASTS, JSON.stringify(SEED_BROADCASTS));
        return SEED_BROADCASTS;
      }
      return JSON.parse(data);
    } catch {
      return SEED_BROADCASTS;
    }
  }

  getActiveBroadcastAnnouncements() {
    return this.getBroadcastAnnouncements().filter((b) => b.active !== false);
  }

  publishBroadcastAnnouncement({ title, message, department, officer, severity = "WARNING" }) {
    const list = this.getBroadcastAnnouncements();
    const newBroadcast = {
      id: `bc_${Date.now()}`,
      title,
      message,
      department: department || "National Civic Operations Command",
      officer: officer || "Municipal Authority",
      severity, // "INFO" | "WARNING" | "EMERGENCY"
      active: true,
      created_at: new Date().toISOString()
    };
    list.unshift(newBroadcast);
    localStorage.setItem(STORAGE_KEY_BROADCASTS, JSON.stringify(list));
    this.recordAuditEvent("BROADCAST", newBroadcast.id, "PUBLISHED", newBroadcast);
    this.notify();
    return newBroadcast;
  }

  dismissBroadcastAnnouncement(id) {
    const list = this.getBroadcastAnnouncements();
    const updated = list.map((b) => (b.id === id ? { ...b, active: false } : b));
    localStorage.setItem(STORAGE_KEY_BROADCASTS, JSON.stringify(updated));
    this.notify();
  }

  // --------------------------------------------------------------------------
  // INCIDENTS API
  // --------------------------------------------------------------------------
  getIncidents() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_INCIDENTS);
      return data ? JSON.parse(data) : SEED_INCIDENTS;
    } catch {
      return SEED_INCIDENTS;
    }
  }

  getIncidentById(id) {
    const incidents = this.getIncidents();
    return incidents.find((inc) => inc.id === id) || null;
  }

  saveIncidents(incidents) {
    localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(incidents));
    this.notify();
  }

  updateIncidentStatus(incidentId, newStatus, officialResponse = "", department = "", priorityScore = null, priorityBadge = null) {
    const incidents = this.getIncidents();
    const index = incidents.findIndex((i) => i.id === incidentId);
    if (index === -1) return null;

    if (newStatus) {
      incidents[index].status = newStatus;
    }
    if (officialResponse) {
      incidents[index].official_response = officialResponse;
    }
    if (department) {
      incidents[index].department = department;
    }
    if (priorityScore !== null && priorityScore !== undefined) {
      incidents[index].priority_score = priorityScore;
    }
    if (priorityBadge) {
      incidents[index].priority = priorityBadge;
    }
    incidents[index].updated_at = new Date().toISOString();

    this.saveIncidents(incidents);
    this.recordAuditEvent("INCIDENT", incidentId, "STATUS_UPDATED", {
      newStatus,
      officialResponse,
      department,
      priorityScore
    });

    return incidents[index];
  }

  // --------------------------------------------------------------------------
  // MICRO-PROTEST API
  // --------------------------------------------------------------------------
  getMicroProtests() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PROTESTS);
      return data ? JSON.parse(data) : SEED_PROTESTS;
    } catch {
      return SEED_PROTESTS;
    }
  }

  getMicroProtestForIncident(incidentId) {
    const protests = this.getMicroProtests();
    return protests.find((p) => p.incident_id === incidentId) || null;
  }

  saveMicroProtests(protests) {
    localStorage.setItem(STORAGE_KEY_PROTESTS, JSON.stringify(protests));
    this.notify();
  }

  getSupports() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SUPPORTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  hasCitizenSupported(microProtestId, citizenId) {
    if (!citizenId) return false;
    const supports = this.getSupports();
    return supports.some((s) => s.micro_protest_id === microProtestId && s.citizen_id === citizenId);
  }

  /**
   * Transactional support recording with strict uniqueness and identity verification
   */
  supportMicroProtest(microProtestId, citizenId, verificationSnapshot = null) {
    const protests = this.getMicroProtests();
    const pIndex = protests.findIndex((p) => p.id === microProtestId);
    if (pIndex === -1) {
      return { success: false, error: "Micro-protest campaign not found." };
    }

    const campaign = protests[pIndex];
    const supports = this.getSupports();

    // Check identity verification
    const verification = verificationSnapshot || verificationService.getVerificationStatus(citizenId);
    if (!verification.isVerified) {
      return {
        success: false,
        error: "Verification Required: Only citizens with verified credentials (Aadhaar / Gov ID) can record support."
      };
    }

    // Validate support eligibility & uniqueness
    const validation = microProtestService.validateSupportAttempt(
      campaign,
      citizenId,
      verification.isVerified,
      supports
    );

    if (!validation.canSupport) {
      return {
        success: false,
        alreadySupported: validation.alreadySupported || false,
        error: validation.error
      };
    }

    // Atomic increment
    campaign.support_count = (campaign.support_count || 0) + 1;
    campaign.unique_support_count = (campaign.unique_support_count || 0) + 1;
    campaign.velocity_6h = (campaign.velocity_6h || 0) + 1;
    campaign.last_count_update = new Date().toISOString();
    protests[pIndex] = campaign;

    const newSupport = {
      id: `sup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      micro_protest_id: microProtestId,
      citizen_id: citizenId,
      created_at: new Date().toISOString(),
      verification_snapshot: verification,
      status: "CONFIRMED"
    };

    supports.push(newSupport);

    localStorage.setItem(STORAGE_KEY_PROTESTS, JSON.stringify(protests));
    localStorage.setItem(STORAGE_KEY_SUPPORTS, JSON.stringify(supports));

    this.recordAuditEvent("MICRO_PROTEST", microProtestId, "SUPPORT_ADDED", {
      citizenId,
      newSupportCount: campaign.support_count
    });

    this.notify();

    return {
      success: true,
      newSupportCount: campaign.support_count,
      velocity6h: campaign.velocity_6h
    };
  }

  // --------------------------------------------------------------------------
  // CITIZEN REPORTING & AI CLUSTERING PIPELINE
  // --------------------------------------------------------------------------
  async processNewCitizenReport({ title, description, category, location, photoUrl, user, latitude, longitude }) {
    // 1. AI Analysis & Extraction (Real OpenRouter LLM or Local Neural Core)
    const aiAnalysis = await analyzeCivicReportAsync(description, location);
    const assignedCategory = category || aiAnalysis.category;
    const cleanTitle = title || aiAnalysis.normalizedProblem;

    const newReportRecord = {
      id: `rep_${Date.now()}`,
      user_id: user?.id || "anon",
      title: cleanTitle,
      description,
      category: assignedCategory,
      location: location || "Recorded Area",
      photo_url: photoUrl || null,
      status: "pending",
      severity: aiAnalysis.severity,
      latitude: latitude || 28.6139,
      longitude: longitude || 77.2090,
      ai_summary: aiAnalysis.normalizedProblem,
      ai_model: aiAnalysis.model || "Local Heuristic Engine",
      created_at: new Date().toISOString()
    };

    // 2. Semantic Clustering Engine
    const incidents = this.getIncidents();
    let matchedIncident = null;
    let highestSimilarity = 0;

    for (const inc of incidents) {
      if (inc.status === "resolved" || inc.status === "dismissed") continue;
      const sim = computeSemanticSimilarity(newReportRecord, inc);
      if (sim.isCandidate && sim.score > highestSimilarity) {
        highestSimilarity = sim.score;
        matchedIncident = inc;
      }
    }

    let isClustered = false;

    if (matchedIncident && highestSimilarity >= 0.38) {
      // Clustered into existing incident!
      isClustered = true;
      matchedIncident.count = (matchedIncident.count || 1) + 1;
      matchedIncident.velocity_6h = (matchedIncident.velocity_6h || 0) + 1;
      matchedIncident.last_reported_at = new Date().toISOString();

      // Recalculate dynamic priority
      const newPriority = calculateDynamicPriority({
        severityScore: aiAnalysis.severityScore,
        impactScore: aiAnalysis.impactScore,
        reportCount: matchedIncident.count,
        velocity6h: matchedIncident.velocity_6h,
        confidence: aiAnalysis.confidence,
        evidenceCount: Math.max(1, Math.floor(matchedIncident.count * 0.3))
      });

      matchedIncident.priority_score = newPriority.finalPriority;
      matchedIncident.priority = newPriority.priorityBadge;
      matchedIncident.priority_breakdown = newPriority.breakdown;
      matchedIncident.ai_model = aiAnalysis.model || matchedIncident.ai_model;

      newReportRecord.incident_id = matchedIncident.id;
      this.saveIncidents(incidents);
    } else {
      // Create new unified incident
      const initialPriority = calculateDynamicPriority({
        severityScore: aiAnalysis.severityScore,
        impactScore: aiAnalysis.impactScore,
        reportCount: 1,
        velocity6h: 1,
        confidence: aiAnalysis.confidence,
        evidenceCount: photoUrl ? 1 : 0
      });

      const newIncident = {
        id: `inc_${Date.now()}`,
        title: cleanTitle,
        description,
        category: assignedCategory,
        status: "NEW",
        severity: aiAnalysis.severity,
        priority: initialPriority.priorityBadge,
        priority_score: initialPriority.finalPriority,
        priority_breakdown: initialPriority.breakdown,
        location: location || "Recorded Area",
        latitude: latitude || 28.6139,
        longitude: longitude || 77.2090,
        count: 1,
        velocity_6h: 1,
        department: "Municipal Corporation",
        official_response: "New incident registered. Queued for departmental triage.",
        ai_summary: `AI Assessment: ${aiAnalysis.normalizedProblem}. Initial priority computed at ${initialPriority.finalPriority}.`,
        ai_model: aiAnalysis.model || "CivicShield Neural Engine",
        first_reported_at: new Date().toISOString(),
        last_reported_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      newReportRecord.incident_id = newIncident.id;
      incidents.unshift(newIncident);
      this.saveIncidents(incidents);
      matchedIncident = newIncident;

      // Automatically evaluate & create Micro-Protest if eligible
      const eligibility = microProtestService.evaluateEligibility(newIncident);
      if (eligibility.eligible) {
        const protests = this.getMicroProtests();
        const demand = await generatePublicDemandAsync(newIncident);
        const newCampaign = microProtestService.createCampaign(newIncident, user?.id, demand);
        protests.unshift(newCampaign);
        this.saveMicroProtests(protests);
      }
    }

    // Save report to local cache
    try {
      const data = localStorage.getItem(STORAGE_KEY_REPORTS);
      const reports = data ? JSON.parse(data) : [];
      reports.unshift(newReportRecord);
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
    } catch {
      // ignore
    }

    // Attempt Supabase insert in parallel (if connected and authenticated)
    if (user?.id) {
      try {
        await supabase.from("reports").insert([
          {
            title: newReportRecord.title,
            description: newReportRecord.description,
            category: newReportRecord.category,
            location: newReportRecord.location,
            photo_url: newReportRecord.photo_url,
            status: "pending",
            severity: newReportRecord.severity,
            user_id: user.id
          }
        ]);
      } catch (err) {
        console.warn("Supabase background insert note:", err.message);
      }
    }

    this.notify();

    return {
      report: newReportRecord,
      incident: matchedIncident,
      isClustered,
      similarityScore: highestSimilarity,
      aiAnalysis
    };
  }

  // --------------------------------------------------------------------------
  // AUDIT LOGGING
  // --------------------------------------------------------------------------
  recordAuditEvent(entityType, entityId, action, payload = {}) {
    try {
      const data = localStorage.getItem(STORAGE_KEY_AUDIT);
      const logs = data ? JSON.parse(data) : [];
      logs.unshift({
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        entity_type: entityType,
        entity_id: entityId,
        action,
        payload,
        created_at: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(logs.slice(0, 200)));
    } catch {
      // ignore
    }
  }

  getAuditLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_AUDIT);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
}

export const civicStore = new CivicStore();
