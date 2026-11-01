# Bestie Clinical Sim — 3D Asset Production Specification
## Technical Standard for 3D Artists, Animators, and Fabricators

This specification governs all 3D assets produced for the **Bestie Virtual Teaching Hospital**. Adherence is mandatory to ensure visual consistency, real-time performance on standalone VR headsets (Meta Quest), and seamless clinical interaction binding.

---

### 1. General Modeling & Scale Rules

| Parameter | Standard | Rule |
| :--- | :--- | :--- |
| **System Units** | Metric | $1.0\text{ unit} = 1.0\text{ metre}$. Real-world medical measurements must be verified. |
| **Coordinate System** | Y-Up, Right-Handed | $+Y = \text{Up}$, $-Z = \text{Forward}$, $+X = \text{Right}$. |
| **Pivot / Origin** | Base-Center or Joint Anchor | Grounded furniture pivots at bottom-center $(0,0,0)$; handheld tools pivot at the natural grip center. |
| **Source File Format** | `.blend` (Blender 4.x+) | Keep modifiers unapplied in master working files; export clean triangulated/quad geometry. |
| **Runtime Target** | `.glb` / `.gltf` (Khronos PBR) | Embedded or KHR_texture_basisu compressed textures. |

---

### 2. Geometry & Polygon Budgets (Mobile VR Target: 72–90 FPS)

| Asset Category | Target Triangle Budget | Maximum Draw Calls | Notes |
| :--- | :--- | :--- | :--- |
| **Hospital Room Shell** | 4,000 – 8,000 tris | 2 – 4 | Walls, floor, ceiling, skirting, doors, headwall. |
| **Hospital Bed (Hill-Rom)** | 8,000 – 14,000 tris | 3 – 5 | Separate mesh for articulated backrest, rails, and wheels. |
| **Major Medical Machine** | 4,000 – 8,000 tris | 2 – 4 | Ventilator, defibrillator, ultrasound, CT gantry. |
| **Bedside Handheld Tool** | 800 – 2,500 tris | 1 | Stethoscope, BP cuff gauge, pulse ox probe, syringe. |
| **Virtual Patient Mesh** | 18,000 – 26,000 tris | 4 – 6 | Head, torso/gown, limbs, articulated jaw and eyes. |
| **Staff Member Avatar** | 12,000 – 18,000 tris | 3 – 4 | Scrub-uniformed avatar with identity badge. |

---

### 3. PBR Texture & Material Standards

- **Workflow**: Metallic-Roughness PBR (`BaseColor`, `Roughness`, `Metallic`, `Normal`, `Emission`, `Occlusion`).
- **Texture Packing**: Standard ORM packing (`R` = Ambient Occlusion, `G` = Roughness, `B` = Metalness) where applicable.
- **Resolution Limits**:
  - Major Room Enclosures: $2048 \times 2048\text{ px}$.
  - Large Machines & Beds: $2048 \times 2048\text{ px}$ (or $2 \times 1024$).
  - Handheld Tools: $512 \times 512\text{ px}$ or $1024 \times 1024\text{ px}$.
  - Decals / Labels / Gauges: Dedicated crisp atlas with high contrast typography.

---

### 4. Interactive Object Contract (Hierarchy & Naming)

To bind directly with the clinical interaction engine, meshes must follow strict naming conventions:

- `INTERACT_{ActionName}`: Mesh with raycast collider triggering clinical action (e.g., `INTERACT_Stethoscope`, `INTERACT_OxygenMask`).
- `SCREEN_{DisplayType}`: Mesh designated for dynamic canvas texture rendering (e.g., `SCREEN_BedsideMonitor`, `SCREEN_Defibrillator`).
- `MOVE_{ComponentName}`: Movable sub-object with pivot at rotation/slide joint (e.g., `MOVE_BedBackrest`, `MOVE_DoorLeaf`, `MOVE_SideRail_Left`).
- `SOCKET_{Name}`: Empty locator for snapping accessories (e.g., `SOCKET_RightHand_IvCannula`, `SOCKET_Finger_PulseOx`).

---

### 5. Collaborator Milestone 001: Emergency Room Test Package

The initial test commission for our 3D design and fabrication collaborators comprises:

1. **Architecture**: 1 Resuscitation Bay Room Shell ($6.6\text{m} \times 6.6\text{m} \times 2.9\text{m}$) with headwall, door, and crash rails.
2. **Bed**: 1 Electric Hill-Rom style hospital bed with movable backrest and caster wheels.
3. **Monitor**: 1 IntelliVue-style multiparameter monitor housing with dedicated screen surface.
4. **Trolley**: 1 Stainless steel overbed instrument tray.
5. **Patient**: 1 Rigged anatomical patient mesh with hospital gown and articulated jaw/chest.
6. **Interaction**: 1 Stethoscope, 1 Pulse oximeter clip, 1 Oxygen mask with tubing.
7. **Physical 3D Print File**: 1 `.stl` / `.3mf` export of an anatomical airway/chest cross-section or tactile pulse sensor bracket for physical manikin mounting.

