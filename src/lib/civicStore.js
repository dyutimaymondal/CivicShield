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
  // -------------------------------------------------------------
  // CLUSTER 1: HOWRAH STATION & STRAND ROAD APPROACH (CRITICAL DENSITY - 11+ Reports)
  // -------------------------------------------------------------
  {
    id: "rep_kol_howrah_1",
    incident_id: "inc_seed_howrah_transit",
    user_id: "citizen_subrata_b",
    citizen_name: "Subrata Banerjee",
    citizen_email: "subrata.b@gmail.com",
    title: "Structural Pothole Trench & Road Subside at Howrah Station Approach",
    description: "Deep subterranean fracture and massive cratering directly outside Howrah Station Bus Terminal causing continuous traffic standstill and hazardous bus tipping.",
    category: "Roads & Transportation",
    location: "Howrah Station Approach Road, Near Platform 1 Bus Terminus, Kolkata",
    latitude: 22.5851,
    longitude: 88.3468,
    photo_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
    status: "in_progress",
    severity: "Critical",
    priority: "P0 - Emergency Dispatch",
    priority_score: 0.94,
    government_verified: true,
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_howrah_2",
    incident_id: "inc_seed_howrah_transit",
    user_id: "citizen_amit_d",
    citizen_name: "Amit Das",
    citizen_email: "amit.das@kolkata.gov.in",
    title: "Burst Underground Water Conduit Flooding Strand Road Junction",
    description: "High pressure potable main burst flooding Strand Road junction under 18 inches of water, submerging two-wheelers.",
    category: "Water Supply & Drainage",
    location: "Strand Road Approach, Howrah Bridge South Ramp, Kolkata",
    latitude: 22.5862,
    longitude: 88.3475,
    status: "pending",
    severity: "Critical",
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_howrah_3",
    incident_id: "inc_seed_howrah_transit",
    user_id: "citizen_priya_m",
    citizen_name: "Priya Mukherjee",
    title: "Severed Overhead Tram Cable Hanging near Howrah Bridge Pedestrian Gate",
    description: "Loose heavy feeder wire dangling within head height of daily railway commuters.",
    category: "Power & Electrical Grid",
    location: "Howrah Bridge Walkway North Entrance, Kolkata",
    latitude: 22.5845,
    longitude: 88.3480,
    status: "pending",
    severity: "Critical",
    created_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_howrah_4",
    incident_id: "inc_seed_howrah_transit",
    user_id: "citizen_debashis_g",
    title: "Overflowing Commercial Trash Compactor Blocking Station Ferry Ghat",
    description: "Compactor breakdown causing 4 tons of fish market and passenger refuse to spill onto ferry access ramp.",
    category: "Solid Waste & Sanitation",
    location: "Armenian Ghat / Howrah Ferry Approach, Kolkata",
    latitude: 22.5838,
    longitude: 88.3490,
    status: "in_progress",
    severity: "High",
    created_at: new Date(Date.now() - 9 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_howrah_5",
    incident_id: "inc_seed_howrah_transit",
    user_id: "citizen_rahul_k",
    title: "Cracked Flyover Expansion Joint Screeching under Heavy Goods Vehicles",
    description: "Metal teeth on expansion joint separated, exposing reinforcing rebar beneath vehicle tyres.",
    category: "Roads & Transportation",
    location: "Brabourne Road Flyover Descent, Near Howrah Approach, Kolkata",
    latitude: 22.5855,
    longitude: 88.3458,
    status: "pending",
    severity: "High",
    created_at: new Date(Date.now() - 11 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_howrah_6",
    incident_id: "inc_seed_howrah_transit",
    user_id: "citizen_somnath_c",
    title: "Broken Drainage Culvert Sinking Walkway near Burrabazar Post Office",
    description: "Pedestrian footpath collapsed into open 2-meter deep storm sewer.",
    category: "Water Supply & Drainage",
    location: "Burrabazar Commercial Gateway, Near Howrah Crossing, Kolkata",
    latitude: 22.5840,
    longitude: 88.3460,
    status: "pending",
    severity: "Critical",
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_howrah_7",
    incident_id: "inc_seed_howrah_transit",
    user_id: "citizen_mita_r",
    title: "Dead Traffic Signals creating 4-way Gridlock at Strand Junction",
    description: "Traffic control board struck by lightning, junction signal completely unpowered for 14 hours.",
    category: "Public Safety & Hazards",
    location: "Strand Road & Canning Street Crossing, Kolkata",
    latitude: 22.5848,
    longitude: 88.3472,
    status: "in_progress",
    severity: "High",
    created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_howrah_8",
    incident_id: "inc_seed_howrah_transit",
    user_id: "citizen_swapan_d",
    title: "Hazardous Open Manhole Without Barricades along Transit Loop",
    description: "Cast-iron lid dislodged by heavy container trailer, leaving cavernous opening in middle lane.",
    category: "Public Safety & Hazards",
    location: "Howrah Station Eastbound Transit Loop, Kolkata",
    latitude: 22.5858,
    longitude: 88.3462,
    status: "pending",
    severity: "Critical",
    created_at: new Date(Date.now() - 15 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_howrah_9",
    incident_id: "inc_seed_howrah_transit",
    user_id: "citizen_anup_g",
    title: "Collapsed Street Light Mast Leaning onto Overhead Bus Cables",
    description: "Corroded base gave way during storm; pole currently wedged against high voltage trolley line.",
    category: "Power & Electrical Grid",
    location: "Ferry Road Terminal, Howrah Bank, Kolkata",
    latitude: 22.5866,
    longitude: 88.3482,
    status: "pending",
    severity: "High",
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_howrah_10",
    incident_id: "inc_seed_howrah_transit",
    user_id: "citizen_tapas_m",
    title: "Toxic Silt and Chemical Sludge Clogging River Outlet Drain",
    description: "Industrial backwash overflowing onto public walkway near Ghat stairs.",
    category: "Water Supply & Drainage",
    location: "Strand Road Ghat 4, Kolkata",
    latitude: 22.5835,
    longitude: 88.3478,
    status: "pending",
    severity: "High",
    created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_howrah_11",
    incident_id: "inc_seed_howrah_transit",
    user_id: "citizen_rajib_b",
    title: "Sinkhole Developing Under Bus Bay 3",
    description: "Asphalt depression growing rapidly over collapsed storm arch, tarmac actively caving inward.",
    category: "Roads & Transportation",
    location: "Howrah Bus Stand Bay 3, Kolkata",
    latitude: 22.5853,
    longitude: 88.3470,
    status: "pending",
    severity: "Critical",
    created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString()
  },

  // -------------------------------------------------------------
  // CLUSTER 2: SALT LAKE SECTOR V TECH HUB (HIGH DENSITY - 7 Reports)
  // -------------------------------------------------------------
  {
    id: "rep_kol_saltlake_1",
    incident_id: "inc_seed_saltlake_it",
    user_id: "citizen_arindam_c",
    citizen_name: "Arindam Chakraborty",
    citizen_email: "arindam.c@wipro.com",
    title: "Continuous Sewer Water Stagnation at College More Tech Intersection",
    description: "Foul standing sewage water blocking pedestrian crossings outside tech park campus gates, breeding mosquitoes.",
    category: "Water Supply & Drainage",
    location: "College More, Sector V, Salt Lake, Kolkata",
    latitude: 22.5735,
    longitude: 88.4331,
    photo_url: "https://images.unsplash.com/photo-1574958269340-fa927304f2dd?auto=format&fit=crop&w=800&q=80",
    status: "in_progress",
    severity: "High",
    priority: "P1 - Urgent Municipal Attention",
    priority_score: 0.84,
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_saltlake_2",
    incident_id: "inc_seed_saltlake_it",
    user_id: "citizen_sneha_r",
    title: "Multiple Exposed High Voltage Junction Boxes along Ring Road Pavement",
    description: "Open electrical panels with live switches left unsealed right along pedestrian footway to Metro gate.",
    category: "Power & Electrical Grid",
    location: "Sector V Ring Road, Outside SDF Building, Salt Lake, Kolkata",
    latitude: 22.5742,
    longitude: 88.4325,
    status: "pending",
    severity: "Critical",
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_saltlake_3",
    incident_id: "inc_seed_saltlake_it",
    user_id: "citizen_tanmoy_s",
    title: "Massive Road Surface Erosion and Deep Craters Near Webel Crossing",
    description: "Heavy shuttle and cab traffic dislodged bituminous top coat leaving 10-meter chain of axle-breaking potholes.",
    category: "Roads & Transportation",
    location: "Webel More Arterial, Sector V, Salt Lake, Kolkata",
    latitude: 22.5728,
    longitude: 88.4340,
    status: "pending",
    severity: "High",
    created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_saltlake_4",
    incident_id: "inc_seed_saltlake_it",
    user_id: "citizen_debolina_p",
    title: "Uncollected Cafeteria Plastic Waste Dump outside Godrej Waterside",
    description: "Over 800 kg of commercial food containers and packaging waste spilling across roadside gutter.",
    category: "Solid Waste & Sanitation",
    location: "DP Block, Near Godrej Waterside, Sector V, Salt Lake, Kolkata",
    latitude: 22.5750,
    longitude: 88.4318,
    status: "pending",
    severity: "Medium",
    created_at: new Date(Date.now() - 13 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_saltlake_5",
    incident_id: "inc_seed_saltlake_it",
    user_id: "citizen_rohit_v",
    title: "Streetlights Blackout on 1.2km IT Corridor Stretch",
    description: "Complete failure of street lighting from Karunamoyee junction to Sector V metro station causing safety anxiety for night-shift tech staff.",
    category: "Power & Electrical Grid",
    location: "Sector V Central Corridor, Salt Lake, Kolkata",
    latitude: 22.5739,
    longitude: 88.4338,
    status: "in_progress",
    severity: "High",
    created_at: new Date(Date.now() - 17 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_saltlake_6",
    incident_id: "inc_seed_saltlake_it",
    user_id: "citizen_ananya_m",
    title: "Clogged Storm Grates Causing Knee-Deep Flooding in Front of RDB Boulevard",
    description: "Construction rubble dumped inside storm grates, preventing rainwater dissipation.",
    category: "Water Supply & Drainage",
    location: "EP Block, RDB Boulevard Junction, Sector V, Salt Lake, Kolkata",
    latitude: 22.5746,
    longitude: 88.4334,
    status: "pending",
    severity: "Medium",
    created_at: new Date(Date.now() - 21 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_saltlake_7",
    incident_id: "inc_seed_saltlake_it",
    user_id: "citizen_rajesh_k",
    title: "Cracked Concrete Divider Spilling Heavy Concrete Blocks on Carriageway",
    description: "Median divider crushed by tipper truck, chunks of concrete obstructing high-speed right lane.",
    category: "Public Safety & Hazards",
    location: "Sector V North Bypass Corridor, Salt Lake, Kolkata",
    latitude: 22.5730,
    longitude: 88.4320,
    status: "pending",
    severity: "High",
    created_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString()
  },

  // -------------------------------------------------------------
  // CLUSTER 3: PARK STREET & CAMAC STREET (MODERATE DENSITY - 4 Reports)
  // -------------------------------------------------------------
  {
    id: "rep_kol_parkst_1",
    incident_id: "inc_seed_parkstreet_civic",
    user_id: "citizen_vikram_s",
    citizen_name: "Vikram Singhania",
    title: "Major Commercial Garbage Heap Accumulating outside Camac St Junction",
    description: "Commercial restaurant dumpsters over capacity; decomposing organic refuse attracting strays and pests.",
    category: "Solid Waste & Sanitation",
    location: "Park Street & Camac Street Crossing, Kolkata",
    latitude: 22.5510,
    longitude: 88.3524,
    photo_url: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80",
    status: "pending",
    severity: "Medium",
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_parkst_2",
    incident_id: "inc_seed_parkstreet_civic",
    user_id: "citizen_joyita_d",
    title: "Broken Paver Blocks and Trip Hazards outside Heritage Arcade",
    description: "Uneven stone tiles on heritage pedestrian arcade causing recurring elderly pedestrian falls.",
    category: "Roads & Transportation",
    location: "Park Street Heritage Walk, Near Allen Park, Kolkata",
    latitude: 22.5516,
    longitude: 88.3532,
    status: "in_progress",
    severity: "Medium",
    created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_parkst_3",
    incident_id: "inc_seed_parkstreet_civic",
    user_id: "citizen_manoj_k",
    title: "Sparking Electrical Distribution Box Outside Shopping Mall Entrance",
    description: "Transformer terminal sizzling audibly in humid weather; sparks dropping near pedestrian queues.",
    category: "Power & Electrical Grid",
    location: "Camac Street Commercial Plaza, Kolkata",
    latitude: 22.5504,
    longitude: 88.3518,
    status: "pending",
    severity: "Critical",
    created_at: new Date(Date.now() - 19 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_parkst_4",
    incident_id: "inc_seed_parkstreet_civic",
    user_id: "citizen_simran_k",
    title: "Damaged Hydrant Spraying High Pressure Water into Shop Fronts",
    description: "Sheared valve head leaking potable water onto roadway continuously.",
    category: "Water Supply & Drainage",
    location: "Russell Street & Park Street Corner, Kolkata",
    latitude: 22.5520,
    longitude: 88.3510,
    status: "pending",
    severity: "Medium",
    created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString()
  },

  // -------------------------------------------------------------
  // CLUSTER 4: BEHALA TRAM DEPOT & DIAMOND HARBOUR ROAD (HIGH DENSITY - 8 Reports)
  // -------------------------------------------------------------
  {
    id: "rep_kol_behala_1",
    incident_id: "inc_seed_behala_transit",
    user_id: "citizen_tushar_d",
    title: "Severe Road Inundation and Broken Culvert at Behala Chowrasta",
    description: "Chronic stormwater waterlogging reaching up to car door level following 20 mins of rain, stalling buses.",
    category: "Water Supply & Drainage",
    location: "Behala Chowrasta, Diamond Harbour Road, Kolkata",
    latitude: 22.4988,
    longitude: 88.3180,
    status: "in_progress",
    severity: "Critical",
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_behala_2",
    incident_id: "inc_seed_behala_transit",
    user_id: "citizen_dipak_m",
    title: "Trench Dug Across Diamond Harbour Rd Left Unpaved without Warning Lights",
    description: "Pipeline contractor left 1.5m wide unpaved ditch with sharp gravel causing multiple motorcycle accidents.",
    category: "Roads & Transportation",
    location: "Diamond Harbour Road, Near Behala Tram Depot, Kolkata",
    latitude: 22.4975,
    longitude: 88.3172,
    status: "pending",
    severity: "High",
    created_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_behala_3",
    incident_id: "inc_seed_behala_transit",
    user_id: "citizen_kavita_s",
    title: "Fallen Tree Branch Crushing Power Lines near James Long Sarani Connector",
    description: "Old banyan bough snapped, resting on 440V distribution lines causing voltage fluctuations.",
    category: "Public Safety & Hazards",
    location: "James Long Sarani, Behala, Kolkata",
    latitude: 22.4995,
    longitude: 88.3192,
    status: "pending",
    severity: "High",
    created_at: new Date(Date.now() - 11 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_behala_4",
    incident_id: "inc_seed_behala_transit",
    user_id: "citizen_prabir_g",
    title: "Blocked Sluice Gate Preventing Neighborhood Drainage Discharge",
    description: "Discharge canal choked with construction plastic debris, water backing up into ground floor homes.",
    category: "Water Supply & Drainage",
    location: "Tarasankar Sarani, Behala West, Kolkata",
    latitude: 22.4980,
    longitude: 88.3168,
    status: "pending",
    severity: "High",
    created_at: new Date(Date.now() - 15 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_behala_5",
    incident_id: "inc_seed_behala_transit",
    user_id: "citizen_rina_d",
    title: "Illegal Plastic & Chemical Waste Burning Emitting Choking Smoke",
    description: "Open burning of commercial synthetic refuse adjacent to residential flats and primary school.",
    category: "Solid Waste & Sanitation",
    location: "Bakultala Road, Behala, Kolkata",
    latitude: 22.4968,
    longitude: 88.3188,
    status: "pending",
    severity: "High",
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_behala_6",
    incident_id: "inc_seed_behala_transit",
    user_id: "citizen_sukhendu_b",
    title: "Deep Pothole Crater Directly on Tram Track Crossing",
    description: "Vehicles swerving unpredictably into oncoming traffic to avoid deep road depression.",
    category: "Roads & Transportation",
    location: "Diamond Harbour Road, Sakher Bazar Junction, Kolkata",
    latitude: 22.4990,
    longitude: 88.3175,
    status: "pending",
    severity: "Medium",
    created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_behala_7",
    incident_id: "inc_seed_behala_transit",
    user_id: "citizen_mousumi_k",
    title: "Leaking Domestic Drinking Water Line Intermixing with Gutter Runoff",
    description: "Porous municipal pipeline submerged inside open drain with foul odor coming through taps.",
    category: "Water Supply & Drainage",
    location: "Pathak Para Lane, Behala, Kolkata",
    latitude: 22.4984,
    longitude: 88.3184,
    status: "pending",
    severity: "Critical",
    created_at: new Date(Date.now() - 27 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_behala_8",
    incident_id: "inc_seed_behala_transit",
    user_id: "citizen_biswajit_r",
    title: "Damaged Road Median Allowing Illegal Dangerous U-Turns",
    description: "Concrete barrier demolished by rogue truck, creating high-speed accident hazard zone.",
    category: "Public Safety & Hazards",
    location: "Behala Chowrasta North Approach, Kolkata",
    latitude: 22.4998,
    longitude: 88.3178,
    status: "pending",
    severity: "Medium",
    created_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString()
  },

  // -------------------------------------------------------------
  // CLUSTER 5: SHYAMBAZAR 5-POINT CROSSING (MODERATE DENSITY - 3 Reports)
  // -------------------------------------------------------------
  {
    id: "rep_kol_shyam_1",
    user_id: "citizen_santanu_b",
    title: "Tram Track Rail Joint Protruding 4 Inches Above Tarmac",
    description: "Steel rail dislodged, ripping car oil sumps and causing scooter wheels to jam.",
    category: "Roads & Transportation",
    location: "Shyambazar 5-Point Crossing, Kolkata",
    latitude: 22.6033,
    longitude: 88.3712,
    status: "in_progress",
    severity: "High",
    created_at: new Date(Date.now() - 9 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_shyam_2",
    user_id: "citizen_madhumita_s",
    title: "Continuous Drainage Sludge Backflow onto Pedestrian Walkway",
    description: "Underground masonry sewer blocked by grease; black sludge flooding outside historic sweet shops.",
    category: "Water Supply & Drainage",
    location: "Bidhan Sarani, Shyambazar, Kolkata",
    latitude: 22.6025,
    longitude: 88.3705,
    status: "pending",
    severity: "Medium",
    created_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_shyam_3",
    user_id: "citizen_aloke_d",
    title: "Unsecured Construction Scaffolding Leaning dangerously over Tram Route",
    description: "Bamboo scaffolding on century-old building detached on 3rd floor, swaying in gusts.",
    category: "Public Safety & Hazards",
    location: "R.G. Kar Road Junction, Shyambazar, Kolkata",
    latitude: 22.6040,
    longitude: 88.3718,
    status: "pending",
    severity: "High",
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  },

  // -------------------------------------------------------------
  // CLUSTER 6: NEW TOWN ACTION AREA 1 (MODERATE DENSITY - 2 Reports)
  // -------------------------------------------------------------
  {
    id: "rep_kol_newtown_1",
    user_id: "citizen_somnath_m",
    title: "High Speed Median Gap Creating Severe Transit Crossing Hazard",
    description: "Absence of pedestrian signal and speeding airport traffic near Biswa Bangla Gate causing near-misses.",
    category: "Public Safety & Hazards",
    location: "Major Arterial Road, Near Biswa Bangla Gate, New Town, Kolkata",
    latitude: 22.5867,
    longitude: 88.4682,
    status: "pending",
    severity: "High",
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_newtown_2",
    user_id: "citizen_payel_d",
    title: "Damaged Solar Streetlight Pole Ready to Fall across Service Lane",
    description: "Corroded pole base vibrating heavily whenever transit buses pass on flyover ramp.",
    category: "Power & Electrical Grid",
    location: "Action Area 1B Service Lane, New Town, Kolkata",
    latitude: 22.5875,
    longitude: 88.4674,
    status: "pending",
    severity: "Medium",
    created_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString()
  },

  // -------------------------------------------------------------
  // CLUSTER 7: ALIPORE / BURDWAN ROAD (LOW DENSITY - 1 Report)
  // -------------------------------------------------------------
  {
    id: "rep_kol_alipore_1",
    user_id: "citizen_harsh_m",
    title: "Overgrown Tree Canopy Obstructing Stop Sign and CCTV Camera",
    description: "Dense branches hanging low, completely obscuring municipal speed check and turn signs.",
    category: "Public Safety & Hazards",
    location: "Burdwan Road, Near Zoo Crossing, Alipore, Kolkata",
    latitude: 22.5320,
    longitude: 88.3300,
    status: "pending",
    severity: "Low",
    created_at: new Date(Date.now() - 32 * 3600 * 1000).toISOString()
  },

  // -------------------------------------------------------------
  // CLUSTER 8: GARIAHAT CROSSING (HIGH DENSITY - 5 Reports)
  // -------------------------------------------------------------
  {
    id: "rep_kol_gariahat_1",
    user_id: "citizen_debjit_r",
    title: "Massive Footpath Encroachment and Open Electrical Wiring at Flyover Foot",
    description: "Temporary stall wiring running along wet pavement slabs under Gariahat Flyover, electrocution risk.",
    category: "Power & Electrical Grid",
    location: "Gariahat Crossing Under Flyover, South Kolkata",
    latitude: 22.5186,
    longitude: 88.3664,
    status: "in_progress",
    severity: "Critical",
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_gariahat_2",
    user_id: "citizen_mousumi_b",
    title: "Collapsed Rain Drain Causing Permanent Stagnant Ponding at Tram Depot",
    description: "Drain channel collapsed beneath asphalt, turning depot entrance into foul puddle.",
    category: "Water Supply & Drainage",
    location: "Rashbehari Avenue & Gariahat Junction, Kolkata",
    latitude: 22.5192,
    longitude: 88.3658,
    status: "pending",
    severity: "High",
    created_at: new Date(Date.now() - 11 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_gariahat_3",
    user_id: "citizen_tanusree_g",
    title: "Accumulation of Commercial Garment Packing Waste and Styrofoam",
    description: "Over 40 boxes of non-biodegradable commercial packing debris dumped directly on corner island.",
    category: "Solid Waste & Sanitation",
    location: "Dover Lane & Gariahat Road, Kolkata",
    latitude: 22.5178,
    longitude: 88.3670,
    status: "pending",
    severity: "Medium",
    created_at: new Date(Date.now() - 19 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_gariahat_4",
    user_id: "citizen_koushik_c",
    title: "Dislodged Manhole Rim Causing Loud Metallic Clatter and Tire Damage",
    description: "Loose heavy manhole cover jumps up 2 inches whenever buses roll over it.",
    category: "Roads & Transportation",
    location: "Ekdalia Road Entry, Gariahat, Kolkata",
    latitude: 22.5182,
    longitude: 88.3652,
    status: "pending",
    severity: "High",
    created_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString()
  },
  {
    id: "rep_kol_gariahat_5",
    user_id: "citizen_sharmila_d",
    title: "Cracked Flyover Pier Base Concrete Surface Erosion",
    description: "Concrete spalling on Pillar 14 revealing rusted rebar cage, needs structural sealing.",
    category: "Public Safety & Hazards",
    location: "Gariahat Flyover Pier 14, Kolkata",
    latitude: 22.5188,
    longitude: 88.3668,
    status: "in_progress",
    severity: "High",
    created_at: new Date(Date.now() - 34 * 3600 * 1000).toISOString()
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

  async getReportsForHeatmap() {
    let rawReports = [];
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        rawReports = data;
      } else {
        rawReports = this.getAllReports();
      }
    } catch {
      rawReports = this.getAllReports();
    }

    // Filter strictly for valid numeric coordinates
    const validReports = [];
    const validateAndPush = (r) => {
      const lat = typeof r.latitude === "number" ? r.latitude : parseFloat(r.latitude);
      const lng = typeof r.longitude === "number" ? r.longitude : parseFloat(r.longitude);

      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        validReports.push({
          ...r,
          latitude: lat,
          longitude: lng,
          severity: r.severity || "Medium",
          category: r.category || "General Concern",
          status: r.status || "pending"
        });
      }
    };

    rawReports.forEach(validateAndPush);

    // If Supabase returned rows without valid coordinates, fallback to local reports with coordinates
    if (validReports.length === 0) {
      const local = this.getAllReports();
      local.forEach(validateAndPush);
    }

    return validReports;
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

    const numLat = (typeof latitude === "number" && !isNaN(latitude)) 
      ? latitude 
      : (typeof latitude === "string" && !isNaN(parseFloat(latitude))) 
      ? parseFloat(latitude) 
      : 22.5726;
    const numLng = (typeof longitude === "number" && !isNaN(longitude)) 
      ? longitude 
      : (typeof longitude === "string" && !isNaN(parseFloat(longitude))) 
      ? parseFloat(longitude) 
      : 88.3639;

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
      latitude: numLat,
      longitude: numLng,
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
        latitude: numLat,
        longitude: numLng,
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
            user_id: user.id,
            latitude: newReportRecord.latitude,
            longitude: newReportRecord.longitude
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
