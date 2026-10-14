# ChoreOps Avengers Dashboard

A responsive Home Assistant Lovelace custom card inspired by the Stark Industries / Avengers family command-center look. Designed for the ChoreOps integration.

## Features

- Dark navy command-center layout with cyan accents
- Family overview for Patrick, Jenny, Leonie, Lisa and Nele (profile names are configurable)
- Discovers ChoreOps entities dynamically from Home Assistant state; no fixed entity IDs required
- Shows task counts, points, badges and task-status sensors
- Calls ChoreOps button entities through Home Assistant when an action button is tapped
- Responsive layout for mobile, tablet and desktop
- No card-mod, Mushroom, Bubble Card or other frontend dependencies

## Install with HACS (manual custom repository)

1. In HACS, open **Frontend** (or Dashboard, depending on your HACS version).
2. Open the menu → **Custom repositories**.
3. Add `https://github.com/patrickbrundiers-dev/ChoreOps-Avengers-Dashboard` with category **Dashboard**.
4. Install **ChoreOps Avengers Dashboard**.
5. Add the resource if HACS did not add it automatically:
   - URL: `/hacsfiles/ChoreOps-Avengers-Dashboard/choreops-avengers-dashboard.js`
   - Resource type: **JavaScript Module**
6. Restart/refresh the Home Assistant frontend.

> This repository is a frontend Lovelace card. It does not replace or modify the ChoreOps integration.

## Add the card

Add a **Manual** card to a dashboard and paste:

```yaml
type: custom:choreops-avengers-dashboard
title: AVENGERS
subtitle: Familienzentrale · Gemeinsame Missionen
profiles:
  - id: patrick
    name: Patrick
    role: Teamleitung
  - id: jenny
    name: Jenny
    role: Mama
  - id: leonie
    name: Leonie
    role: Teammitglied
  - id: lisa
    name: Lisa
    role: Teammitglied
  - id: nele
    name: Nele
    role: Teammitglied
```

Entity discovery uses the profile slug in entity IDs, e.g. `sensor.patrick_choreops_points`, `sensor.patrick_choreops_aufgaben`, and any `sensor.patrick_choreops_aufgabenstatus_*` entities. Buttons with IDs starting with `button.patrick_choreops_aufgabe_` are discovered as task actions. The card uses actual entities exposed by your installation and skips missing entities.

## Notes

- A button is called only when tapped; use the built-in confirmation in the card for approve/reject/penalty-like actions.
- Entity names and labels can differ by ChoreOps version and language. This card matches entity IDs dynamically and displays friendly names where available.
- The card does not assume that the task count is a completed-task count; it displays the integration-provided value as “Aufgaben”.
- This is an initial release. Please report compatibility issues with your ChoreOps entity IDs in GitHub Issues.
