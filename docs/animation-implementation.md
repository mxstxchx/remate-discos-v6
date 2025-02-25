# Vinyl Turntable UI Theme: Animation Implementation

This document outlines the animations implemented as part of the Vinyl Turntable UI theme, which adds tactile, physical interactions to components that mimic the feel of high-end audio equipment.

## Implemented Animated Components

### 1. AnimatedButton

Simulates the tactile feel of pressing a physical button with subtle scale and shadow changes.

**Features:**
- Scale reduction on press (98%)
- Inner shadow on press
- Smooth spring-like return animation
- Compatible with all button variants

**Usage:**
```tsx
import { AnimatedButton } from '@/components/animated';

<AnimatedButton variant="knurled">Press Me</AnimatedButton>
```

### 2. AnimatedCard

Creates depth and interaction cues through hover animations.

**Features:**
- Lift animation on hover (subtle Y-axis translation)
- Shadow expansion for depth
- Compatible with all card variants (default, vinyl, metallic)

**Usage:**
```tsx
import { AnimatedCard } from '@/components/animated';

<AnimatedCard variant="vinyl" hover="lift">
  Card Content
</AnimatedCard>
```

### 3. AnimatedRadioKnob

Simulates the feel of turning a physical knob on a turntable or amplifier.

**Features:**
- Rotation animation when pressed
- Scale increase when selected
- Spring-like animation for realistic feel

**Usage:**
```tsx
import { AnimatedRadioKnob } from '@/components/animated';
import { RadioGroup } from '@/components/ui/radio-group';

<RadioGroup defaultValue="option1">
  <AnimatedRadioKnob value="option1" id="option1" />
  <AnimatedRadioKnob value="option2" id="option2" />
</RadioGroup>
```

### 4. AnimatedCheckbox

Provides a satisfying check animation with a spring-like effect.

**Features:**
- Scale animation when checked
- Check mark fade-in and scaling
- Subtle rotation for organic feel

**Usage:**
```tsx
import { AnimatedCheckbox } from '@/components/animated';

<AnimatedCheckbox checked={isChecked} onCheckedChange={setIsChecked} />
```

### 5. AnimatedSlider

Emulates the pitch and volume controls of audio equipment with tactile feedback.

**Features:**
- Thumb grows when dragged
- Track pulse animation when value changes
- Special pitch control variant with markers

**Usage:**
```tsx
import { AnimatedSlider } from '@/components/animated';

// Standard slider
<AnimatedSlider defaultValue={[50]} max={100} step={1} onValueChange={setValue} />

// Pitch control slider
<AnimatedSlider 
  variant="pitchControl" 
  defaultValue={[0]} 
  min={-5} 
  max={5} 
  step={0.1} 
  onValueChange={setPitch} 
/>
```

### 6. AnimatedInput

Enhances form input fields with subtle interactions.

**Features:**
- Subtle scale animation on focus
- Compatible with all input variants
- Maintains accessibility

**Usage:**
```tsx
import { AnimatedInput } from '@/components/animated';

<AnimatedInput 
  variant="metallic" 
  placeholder="Enter text" 
/>
```

## Animation Principles Used

1. **Physicality**: Animations mimic real-world physics with proper easing and spring effects
2. **Subtlety**: Animations are noticeable but not distracting
3. **Consistency**: Similar interaction patterns across different components
4. **Performance**: Optimized for smooth performance even on less powerful devices
5. **Accessibility**: Animations respect user preferences via `prefers-reduced-motion`

## Technical Implementation

All animations use the `motion` library for performance and consistency:

```tsx
import { animate } from "motion";

// Example animation
animate(
  element,
  { scale: [0.95, 1.05, 1] },
  { duration: 0.3, easing: [0.22, 1.2, 0.36, 1] }
);
```

For hydration compatibility, we use CSS classes for initial states and script-based animations only for interactions.

## Demo Page

A complete demo page showcasing all animated components is available at `/theme-demo`.

## Future Enhancements

1. Add vinyl record rotation animation for loading states
2. Implement more complex LED pulse animations for status indicators
3. Add accessibility options to disable animations based on user preferences
4. Create composite animations for more complex interactions
5. Optimize animations further for mobile devices
