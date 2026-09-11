-- ============================================================================
-- CivicShield: Kolkata Civic Problem Heatmap Telemetry Seed
-- Migration: 20260911_kolkata_reports_seed.sql
-- Description: Seeds realistic civic complaints across Kolkata clusters
-- with valid geographic coordinates (latitude, longitude) and severity weights.
-- ============================================================================

-- 1. Ensure latitude and longitude columns exist on public.reports
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'latitude'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN latitude FLOAT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'longitude'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN longitude FLOAT;
    END IF;
END $$;

-- 2. Insert Kolkata Civic Complaints (Clustered to demonstrate Heatmap density)
INSERT INTO public.reports (
    title, description, category, location, latitude, longitude, severity, status, created_at
) VALUES
-- Cluster 1: Howrah Station / Strand Road Approach (Critical Density - 10+ reports)
(
    'Structural Pothole Trench & Road Subside at Howrah Station Approach',
    'Deep subterranean fracture and massive cratering directly outside Howrah Station Bus Terminal causing continuous traffic standstill and hazardous bus tipping.',
    'Roads & Transportation',
    'Howrah Station Approach Road, Near Platform 1 Bus Terminus, Kolkata',
    22.5851, 88.3468, 'Critical', 'in_progress', now() - interval '4 hours'
),
(
    'Burst Underground Water Conduit Flooding Strand Road Junction',
    'High pressure potable main burst flooding Strand Road junction under 18 inches of water, submerging two-wheelers.',
    'Water Supply & Drainage',
    'Strand Road Approach, Howrah Bridge South Ramp, Kolkata',
    22.5862, 88.3475, 'Critical', 'pending', now() - interval '6 hours'
),
(
    'Severed Overhead Tram Cable Hanging near Howrah Bridge Pedestrian Gate',
    'Loose heavy feeder wire dangling within head height of daily railway commuters.',
    'Power & Electrical Grid',
    'Howrah Bridge Walkway North Entrance, Kolkata',
    22.5845, 88.3480, 'Critical', 'pending', now() - interval '7 hours'
),
(
    'Overflowing Commercial Trash Compactor Blocking Station Ferry Ghat',
    'Compactor breakdown causing 4 tons of fish market and passenger refuse to spill onto ferry access ramp.',
    'Solid Waste & Sanitation',
    'Armenian Ghat / Howrah Ferry Approach, Kolkata',
    22.5838, 88.3490, 'High', 'in_progress', now() - interval '9 hours'
),
(
    'Cracked Flyover Expansion Joint Screeching under Heavy Goods Vehicles',
    'Metal teeth on expansion joint separated, exposing reinforcing rebar beneath vehicle tyres.',
    'Roads & Transportation',
    'Brabourne Road Flyover Descent, Near Howrah Approach, Kolkata',
    22.5855, 88.3458, 'High', 'pending', now() - interval '11 hours'
),
(
    'Broken Drainage Culvert Sinking Walkway near Burrabazar Post Office',
    'Pedestrian footpath collapsed into open 2-meter deep storm sewer.',
    'Water Supply & Drainage',
    'Burrabazar Commercial Gateway, Near Howrah Crossing, Kolkata',
    22.5840, 88.3460, 'Critical', 'pending', now() - interval '12 hours'
),
(
    'Dead Traffic Signals creating 4-way Gridlock at Strand Junction',
    'Traffic control board struck by lightning, junction signal completely unpowered for 14 hours.',
    'Public Safety & Hazards',
    'Strand Road & Canning Street Crossing, Kolkata',
    22.5848, 88.3472, 'High', 'in_progress', now() - interval '14 hours'
),
(
    'Hazardous Open Manhole Without Barricades along Transit Loop',
    'Cast-iron lid dislodged by heavy container trailer, leaving cavernous opening in middle lane.',
    'Public Safety & Hazards',
    'Howrah Station Eastbound Transit Loop, Kolkata',
    22.5858, 88.3462, 'Critical', 'pending', now() - interval '15 hours'
),
(
    'Sinkhole Developing Under Bus Bay 3',
    'Asphalt depression growing rapidly over collapsed storm arch, tarmac actively caving inward.',
    'Roads & Transportation',
    'Howrah Bus Stand Bay 3, Kolkata',
    22.5853, 88.3470, 'Critical', 'pending', now() - interval '22 hours'
),

-- Cluster 2: Salt Lake Sector V Tech Hub (High Density - 7 reports)
(
    'Continuous Sewer Water Stagnation at College More Tech Intersection',
    'Foul standing sewage water blocking pedestrian crossings outside tech park campus gates, breeding mosquitoes.',
    'Water Supply & Drainage',
    'College More, Sector V, Salt Lake, Kolkata',
    22.5735, 88.4331, 'High', 'in_progress', now() - interval '5 hours'
),
(
    'Multiple Exposed High Voltage Junction Boxes along Ring Road Pavement',
    'Open electrical panels with live switches left unsealed right along pedestrian footway to Metro gate.',
    'Power & Electrical Grid',
    'Sector V Ring Road, Outside SDF Building, Salt Lake, Kolkata',
    22.5742, 88.4325, 'Critical', 'pending', now() - interval '8 hours'
),
(
    'Massive Road Surface Erosion and Deep Craters Near Webel Crossing',
    'Heavy shuttle and cab traffic dislodged bituminous top coat leaving 10-meter chain of axle-breaking potholes.',
    'Roads & Transportation',
    'Webel More Arterial, Sector V, Salt Lake, Kolkata',
    22.5728, 88.4340, 'High', 'pending', now() - interval '10 hours'
),
(
    'Uncollected Cafeteria Plastic Waste Dump outside Godrej Waterside',
    'Over 800 kg of commercial food containers and packaging waste spilling across roadside gutter.',
    'Solid Waste & Sanitation',
    'DP Block, Near Godrej Waterside, Sector V, Salt Lake, Kolkata',
    22.5750, 88.4318, 'Medium', 'pending', now() - interval '13 hours'
),
(
    'Streetlights Blackout on 1.2km IT Corridor Stretch',
    'Complete failure of street lighting from Karunamoyee junction to Sector V metro station causing safety anxiety for night-shift tech staff.',
    'Power & Electrical Grid',
    'Sector V Central Corridor, Salt Lake, Kolkata',
    22.5739, 88.4338, 'High', 'in_progress', now() - interval '17 hours'
),
(
    'Clogged Storm Grates Causing Knee-Deep Flooding in Front of RDB Boulevard',
    'Construction rubble dumped inside storm grates, preventing rainwater dissipation.',
    'Water Supply & Drainage',
    'EP Block, RDB Boulevard Junction, Sector V, Salt Lake, Kolkata',
    22.5746, 88.4334, 'Medium', 'pending', now() - interval '21 hours'
),
(
    'Cracked Concrete Divider Spilling Heavy Concrete Blocks on Carriageway',
    'Median divider crushed by tipper truck, chunks of concrete obstructing high-speed right lane.',
    'Public Safety & Hazards',
    'Sector V North Bypass Corridor, Salt Lake, Kolkata',
    22.5730, 88.4320, 'High', 'pending', now() - interval '25 hours'
),

-- Cluster 3: Park Street & Camac Street (Moderate Density - 4 reports)
(
    'Major Commercial Garbage Heap Accumulating outside Camac St Junction',
    'Commercial restaurant dumpsters over capacity; decomposing organic refuse attracting strays and pests.',
    'Solid Waste & Sanitation',
    'Park Street & Camac Street Crossing, Kolkata',
    22.5510, 88.3524, 'Medium', 'pending', now() - interval '6 hours'
),
(
    'Broken Paver Blocks and Trip Hazards outside Heritage Arcade',
    'Uneven stone tiles on heritage pedestrian arcade causing recurring elderly pedestrian falls.',
    'Roads & Transportation',
    'Park Street Heritage Walk, Near Allen Park, Kolkata',
    22.5516, 88.3532, 'Medium', 'in_progress', now() - interval '14 hours'
),
(
    'Sparking Electrical Distribution Box Outside Shopping Mall Entrance',
    'Transformer terminal sizzling audibly in humid weather; sparks dropping near pedestrian queues.',
    'Power & Electrical Grid',
    'Camac Street Commercial Plaza, Kolkata',
    22.5504, 88.3518, 'Critical', 'pending', now() - interval '19 hours'
),
(
    'Damaged Hydrant Spraying High Pressure Water into Shop Fronts',
    'Sheared valve head leaking potable water onto roadway continuously.',
    'Water Supply & Drainage',
    'Russell Street & Park Street Corner, Kolkata',
    22.5520, 88.3510, 'Medium', 'pending', now() - interval '26 hours'
),

-- Cluster 4: Behala Chowrasta (High Density - 5 reports)
(
    'Severe Road Inundation and Broken Culvert at Behala Chowrasta',
    'Chronic stormwater waterlogging reaching up to car door level following 20 mins of rain, stalling buses.',
    'Water Supply & Drainage',
    'Behala Chowrasta, Diamond Harbour Road, Kolkata',
    22.4988, 88.3180, 'Critical', 'in_progress', now() - interval '3 hours'
),
(
    'Trench Dug Across Diamond Harbour Rd Left Unpaved without Warning Lights',
    'Pipeline contractor left 1.5m wide unpaved ditch with sharp gravel causing multiple motorcycle accidents.',
    'Roads & Transportation',
    'Diamond Harbour Road, Near Behala Tram Depot, Kolkata',
    22.4975, 88.3172, 'High', 'pending', now() - interval '7 hours'
),
(
    'Fallen Tree Branch Crushing Power Lines near James Long Sarani Connector',
    'Old banyan bough snapped, resting on 440V distribution lines causing voltage fluctuations.',
    'Public Safety & Hazards',
    'James Long Sarani, Behala, Kolkata',
    22.4995, 88.3192, 'High', 'pending', now() - interval '11 hours'
),
(
    'Blocked Sluice Gate Preventing Neighborhood Drainage Discharge',
    'Discharge canal choked with construction plastic debris, water backing up into ground floor homes.',
    'Water Supply & Drainage',
    'Tarasankar Sarani, Behala West, Kolkata',
    22.4980, 88.3168, 'High', 'pending', now() - interval '15 hours'
),
(
    'Illegal Plastic & Chemical Waste Burning Emitting Choking Smoke',
    'Open burning of commercial synthetic refuse adjacent to residential flats and primary school.',
    'Solid Waste & Sanitation',
    'Bakultala Road, Behala, Kolkata',
    22.4968, 88.3188, 'High', 'pending', now() - interval '18 hours'
),

-- Cluster 5: Alipore / Burdwan Road (Low Density - 1 report)
(
    'Overgrown Tree Canopy Obstructing Stop Sign and CCTV Camera',
    'Dense branches hanging low, completely obscuring municipal speed check and turn signs.',
    'Public Safety & Hazards',
    'Burdwan Road, Near Zoo Crossing, Alipore, Kolkata',
    22.5320, 88.3300, 'Low', 'pending', now() - interval '32 hours'
);
