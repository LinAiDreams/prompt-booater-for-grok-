# Third-party assets

## The Study: seated figure
- Source: MakeHuman 1.1 base mesh (`makehuman/data/3dobjs/base.obj`), default rig (`data/rigs/default.mhskel`)
  and weights (`data/rigs/default_weights.mhw`) from https://github.com/makehumancommunity/makehuman
- License: CC0 1.0 Universal (MakeHuman bundled assets; the rig and weight files also declare `"license": "CC0"`).
- Changes: posed offline into a seated typing pose by linear-blend skinning (`pose.py` with `pose.json`),
  body group only, embedded as base64 (float32 positions + uint16 indices) in `the-study.html`.
