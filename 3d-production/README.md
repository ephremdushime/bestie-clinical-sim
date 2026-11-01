# Bestie Clinical Sim — 3D Asset Production Repository
## Collaborator Working Directory & Milestone 001 Assignment

Welcome to the 3D production pipeline for the **Bestie Virtual Teaching Hospital**.

All 3D assets, source `.blend` files, exported `.glb` models, and `.stl` / `.3mf` physical fabrication files must be organized according to this structure:

```
3d-production/
├── hospital-architecture/     # Rooms, walls, doors, ceiling troffers, headwalls
├── medical-equipment/         # Beds, monitors, ventilators, defibrillators, tools
├── human-characters/          # Patients, scrubs, staff, rigs, blendshapes
├── printable-models/          # Physical manikin brackets, anatomical STL/3MF prints
└── textures/                  # Shared texture atlases, decals, signage, PBR maps
```

---

### Immediate Commission: Milestone 001 — Emergency Room Test Package

Collaborators are requested to deliver the following 7 reference items:

| # | Item | Category | Specifications | Target File |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Resuscitation Bay Shell** | Architecture | $6.6\text{m} \times 6.6\text{m} \times 2.9\text{m}$, North headwall with medical gas outlets ($O_2$, Vac, Air), vinyl floor, crash rails at $0.95\text{m}$. | `hospital-architecture/room_resus_bay.glb` |
| **2** | **Electric Hospital Bed** | Equipment | Hill-Rom style electric bed, movable Fowler's backrest (`MOVE_Backrest`), side rails, 4 caster wheels with red brake pedals. | `medical-equipment/bed_hillrom_resus.glb` |
| **3** | **Multiparameter Monitor** | Equipment | IntelliVue-style casing with dedicated flat screen geometry (`SCREEN_Intellivue`) mapped to 4:3 UV space for live canvas telemetry. | `medical-equipment/monitor_intellivue.glb` |
| **4** | **Instrument Trolley** | Equipment | Stainless steel mobile Mayo stand / overbed tray with polished chrome material. | `medical-equipment/trolley_mayo_stand.glb` |
| **5** | **Virtual Patient Character** | Character | Adult anatomical human mesh in hospital gown with articulated jaw bone, eyelid blendshapes, and chest breathing bones. | `human-characters/patient_adult_rigged.glb` |
| **6** | **Handheld Clinical Tool** | Tool | Littmann-style acoustic stethoscope with tunable diaphragm and dual binaural headset (`INTERACT_Stethoscope`). | `medical-equipment/tool_stethoscope.glb` |
| **7** | **Physical Manikin Bracket** | 3D Print | 3D-printable mounting clip or cross-section for physical pulse/respiratory sensor housing. | `printable-models/manikin_sensor_clip.stl` |

---

### Delivery Checklist
Before submitting assets into this directory:
- [ ] Scale verified: $1.0\text{ unit} = 1.0\text{ metre}$.
- [ ] Geometry within polygon budget (see [`docs/ASSET_PRODUCTION_SPECIFICATION.md`](../docs/ASSET_PRODUCTION_SPECIFICATION.md)).
- [ ] Origin/pivot points placed at base-center or joint rotation axis.
- [ ] PBR textures embedded or provided as standard PNG/WebP maps (`BaseColor`, `Roughness`, `Metallic`, `Normal`).
- [ ] Meshes follow the interaction prefix contract (`INTERACT_`, `SCREEN_`, `MOVE_`, `SOCKET_`).

