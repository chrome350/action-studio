# UI changes

Before changing the editor UI, read `design-system/README.md` and the relevant CSS in `design-system/`.
Reuse the existing components and tokens. Do not invent a new button, field, slider, checkbox, icon treatment or surface when an existing one fits. Add necessary variants centrally and show them in `design-system/index.html`.

Source of truth: `design-system/*.css`. Run `npm run build:design-system` after changing it; both `assets/index-DlFOVRFE.css` and `Grid Studio.html` must stay synchronized. The full build also applies this system last. Preserve runtime behavior and existing user changes.

Keep slider minimum/maximum indicators aligned and clear of labels/numbers. Check the 272 px sidebar and narrow layout. Maintain keyboard focus visibility. Changing icon size must not change its button hit area.

The gallery and practice prototypes have separate visual requirements; do not restyle them as a side effect of editor work.
