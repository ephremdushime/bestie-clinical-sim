# Bestie Virtual Teaching Hospital — Collaborator Handover Pack
## Milestone 001: Emergency Resuscitation Bay Package

This handover pack contains technical specifications, dimensional tolerances, component naming rules, and acceptance verification criteria for 3D modelers, animators, and 3D printing specialists.

---

### 1. General Deliverable Standards

1. **Units**: $1.0\text{ unit} = 1.0\text{ metre}$ strictly. Verify that $100\text{cm}$ in Blender equals $1.0\text{m}$.
2. **Pivots (Origins)**:
   - Furniture/Beds: Base-center at floor level $(0, 0, 0)$.
   - Articulated parts (e.g. backrest, wheels, drawers): Pivot placed exactly along the rotation/hinge axis.
   - Handheld tools: Pivot placed at the center of the palm grasp.
3. **Materials**: PBR Metallic-Roughness workflow only.
   - Channel packing: Standard ORM texture where feasible (Red = Ambient Occlusion, Green = Roughness, Blue = Metalness).
   - Normal maps: OpenGL format ($+Y$ Green channel up).

---

### 2. Component Specifications (Milestone 001)

#### Asset 1: Resuscitation Room Shell (`room_resus_bay.glb`)
- **Dimensions**: $6.6\text{m}\text{ (Width)} \times 6.6\text{m}\text{ (Depth)} \times 2.9\text{m}\text{ (Height)}$.
- **North Headwall**:
  - Horizontal anodized aluminum service trunking mounted at $1.68\text{m}$ height.
  - Medical gas terminal outlets color-coded:
    - 2x Oxygen ($O_2$): British/ISO Green (`#16a34a`).
    - 1x Medical Air: Yellow (`#eab308`).
    - 2x Medical Vacuum: White (`#f1f5f9`).
  - Rotameter glass tube with floating steel bobbin.
  - Suction canister ($1000\text{mL}$ fluid collector).
- **Walls & Floor**:
  - Antimicrobial welded vinyl floor with specular reflection ($0.18$ roughness).
  - Perimeter coved skirting ($0.14\text{m}$ height).
  - Continuous dual-tone impact crash bumper rails at $0.95\text{m}$ height along all walls.
- **Door**: Single leaf with vision panel, stainless steel kickplate, and push-plate handle.
- **Ceiling**: $600 \times 600\text{mm}$ modular acoustic tile grid with 4 recessed $920 \times 920\text{mm}$ LED troffers.
- **Budget**: $< 8,000$ triangles, 1x $2048 \times 2048$ PBR texture set.

#### Asset 2: Hill-Rom Style Electric Resus Bed (`bed_hillrom_resus.glb`)
- **Dimensions**: $2.15\text{m}\text{ (Length)} \times 1.06\text{m}\text{ (Width)} \times 0.65\text{m}\text{ (Mattress Height)}$.
- **Hierarchy & Naming**:
  - `bed_chassis`: Main frame, electric telescopic columns, and footboard.
  - `MOVE_Backrest`: Fowler's articulated upper mattress section. Pivot at $Z = -0.22\text{m}$ to allow tilting from $0^\circ$ (flat) to $65^\circ$ upright.
  - `MOVE_Rail_Left` & `MOVE_Rail_Right`: Chrome split safety side rails capable of dropping down.
  - 4x Caster Wheels: $130\text{mm}$ diameter rubber wheels with red brake pedal levers.
- **Budget**: $< 12,000$ triangles, 1x $2048 \times 2048$ PBR texture set.

#### Asset 3: Philips IntelliVue MP70 Monitor (`monitor_intellivue.glb`)
- **Dimensions**: $420\text{mm}\text{ (Width)} \times 340\text{mm}\text{ (Height)} \times 160\text{mm}\text{ (Depth)}$.
- **Mounting**: Articulated heavy-duty wall/trolley swivel arm.
- **Screen Geometry**:
  - Separate quad mesh named `SCREEN_Monitor`.
  - UV mapping must be cleanly unwrapped to fill the 0-1 UV coordinate space with standard 4:3 aspect ratio.
  - This mesh receives the dynamic 60 FPS HTML5 canvas texture displaying live Lead II ECG, SpO2, NIBP, and vitals.
- **Physical Controls**: Rotary navigator knob, alarm silence button, and power LED indicator.
- **Budget**: $< 5,000$ triangles, 1x $1024 \times 1024$ PBR texture set.

#### Asset 4: Stainless Steel Mayo Stand / Overbed Trolley (`trolley_mayo_stand.glb`)
- **Dimensions**: $750\text{mm}\text{ (Length)} \times 550\text{mm}\text{ (Width)} \times 850\text{mm}\text{ (Height)}$.
- **Material**: High specular polished stainless steel (Roughness: $0.15$, Metalness: $0.95$).
- **Features**: Single-post height adjustable column, flat sterile instrument tray surface.
- **Budget**: $< 2,000$ triangles.

#### Asset 5: Adult Virtual Patient Model (`patient_adult_rigged.glb`)
- **Anatomy**: Anatomical adult human figure in semi-recumbent posture ($45^\circ$).
- **Gown**: Standard hospital gown with ties and modesty drape covering lower extremities.
- **Rigging Hierarchy**:
  - `root` $\rightarrow$ `pelvis` $\rightarrow$ `spine_01` $\rightarrow$ `spine_02` (chest breathing bone) $\rightarrow$ `neck` $\rightarrow$ `head`.
  - `jaw_bone`: Articulated jaw for mouth opening ("say ah" / speech animation).
  - Left & Right Clavicle, Upper Arm, Forearm, Hand.
- **Blendshapes / Morph Targets**:
  - `blink_left`, `blink_right`: Natural eyelid closure.
  - `pupil_constrict`: Dynamic pupillary sphincter muscle reflex.
- **Budget**: $< 24,000$ triangles, 1x $2048 \times 2048$ body/gown texture.

#### Asset 6: Littmann Cardiology Stethoscope (`tool_stethoscope.glb`)
- **Dimensions**: $690\text{mm}$ total length.
- **Components**:
  - Dual-head chestpiece named `INTERACT_Stethoscope`: $45\text{mm}$ adult tunable diaphragm on one side, open acoustic bell with non-chill rim on reverse.
  - Flexible dual-lumen PVC tubing (Navy Blue `#1e3a5f`).
  - Stainless steel binaural eartubes with soft-sealing silicone eartips.
- **Budget**: $< 2,500$ triangles.

#### Asset 7: Physical Manikin Sensor Bracket (`manikin_sensor_clip.stl` / `.3mf`)
- **Purpose**: Physical 3D-printed clip designed to attach to real medical manikins (e.g., Laerdal SimMan or ALS manikins) to mount an optical pulse or respiration sensor.
- **Tolerances**: Print tolerance $\pm 0.2\text{mm}$, optimized for FDM printing in PLA or PETG without requiring supports.
- **Format**: `.stl` and `.3mf`.

---

### 3. Acceptance Verification Checklist

Every collaborator delivery will be evaluated against this pass/fail matrix:

| Check | Requirement | Verification Method |
| :--- | :--- | :--- |
| **Scale Accuracy** | $1.0\text{ unit} = 1.0\text{m} \pm 2\%$ | Measured in Three.js and Blender bounding box. |
| **Origin Placement** | Furniture at $(0,0,0)$ floor; tools at hand grip | Checked upon import into `assetLoader.js`. |
| **Polygon Budget** | Strictly below category limits | Checked via triangle count audit in GLTF viewer. |
| **Draw Call Count** | $\le 4$ materials/submeshes per asset | Inspected in Three.js render telemetry. |
| **Naming Contract** | `INTERACT_`, `SCREEN_`, `MOVE_`, `SOCKET_` prefixes | Verified by automated metadata parser. |
| **Performance** | Constant 72+ FPS on Meta Quest 3 standalone | Measured on Quest 3 via OVR Metrics Tool. |

