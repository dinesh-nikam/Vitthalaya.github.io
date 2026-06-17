# Hero Page Overrides

## Specific Requirements for Home/Hero

### Layout
- Full-screen hero on mobile (min 100vh)
- Animated SVG background layer (behind content)
- Marathi headline centered vertically and horizontally
- Search bar below headline, 60% width max on desktop

### Background Animation Elements
1. **Temple Silhouette** - Static SVG backdrop
2. **Chandrabhaga River** - Slow flow animation (30s cycle)
3. **Saffron Flags** - Gentle waving (8s ease-in-out)
4. **Diya Particles** - Floating glow dots (20s linear drift)
5. **Temple Bells** - Subtle swing on hover (spring animation)

### Interactive Elements
- Search placeholder rotates every 3s with cultural examples
- Festival strip below hero auto-scrolls on desktop
- Featured saints grid with hover elevation

### Mobile-First Considerations
- Hero text scales with clamp()
- Touch targets for all mobile interactions
- Safe area padding for notched devices
- No horizontal scroll on any viewport