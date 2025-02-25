"use client"

import React, { useState } from 'react';
import { TopLayout } from '@/components/layout/TopLayout';
import { 
  AnimatedButton, 
  AnimatedCard, 
  AnimatedRadioGroupKnob, 
  AnimatedCheckbox,
  AnimatedSlider,
  AnimatedInput
} from '@/components/animated';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ThemeDemo() {
  const [sliderValue, setSliderValue] = useState([5]);
  const [volumeValue, setVolumeValue] = useState([50]);
  const [isToggled, setIsToggled] = useState(false);
  const [selectedKnob, setSelectedKnob] = useState("speed-33");

  return (
    <div className="min-h-screen">
      <TopLayout />
      
      <main className="container mx-auto px-4 py-20">
        <h1 className="text-3xl font-heading font-bold mb-8 text-center">Vinyl Turntable UI Theme Demo</h1>
        
        {/* Buttons Demo */}
        <section className="mt-12">
          <h2 className="text-2xl font-heading font-bold mb-4">Buttons</h2>
          <Card>
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-4">
                <Label>Default</Label>
                <AnimatedButton>Default Button</AnimatedButton>
              </div>
              
              <div className="space-y-4">
                <Label>Secondary</Label>
                <AnimatedButton variant="secondary">Secondary Button</AnimatedButton>
              </div>
              
              <div className="space-y-4">
                <Label>Knurled</Label>
                <AnimatedButton variant="knurled">Knurled Button</AnimatedButton>
              </div>
              
              <div className="space-y-4">
                <Label>LED Status</Label>
                <AnimatedButton variant="led" ledColor="success">LED Success</AnimatedButton>
              </div>
              
              <div className="space-y-4">
                <Label>LED Error</Label>
                <AnimatedButton variant="led" ledColor="error">LED Error</AnimatedButton>
              </div>
              
              <div className="space-y-4">
                <Label>LED Warning</Label>
                <AnimatedButton variant="led" ledColor="warning">LED Warning</AnimatedButton>
              </div>
              
              <div className="space-y-4">
                <Label>LED Info</Label>
                <AnimatedButton variant="led" ledColor="info">LED Info</AnimatedButton>
              </div>
              
              <div className="space-y-4">
                <Label>Destructive</Label>
                <AnimatedButton variant="destructive">Destructive</AnimatedButton>
              </div>
            </CardContent>
          </Card>
        </section>
        
        {/* Cards Demo */}
        <section className="mt-12">
          <h2 className="text-2xl font-heading font-bold mb-4">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimatedCard variant="default" hover="lift" className="p-6">
              <h3 className="text-lg font-bold mb-2">Default Card</h3>
              <p className="text-muted-foreground">Hover to see the lift animation</p>
            </AnimatedCard>
            
            <AnimatedCard variant="metallic" hover="lift" className="p-6">
              <h3 className="text-lg font-bold mb-2">Metallic Card</h3>
              <p className="text-muted-foreground">With brushed metal texture</p>
            </AnimatedCard>
            
            <AnimatedCard variant="vinyl" hover="lift" className="p-6">
              <h3 className="text-lg font-bold mb-2">Vinyl Card</h3>
              <p className="text-muted-foreground">With vinyl texture effect</p>
            </AnimatedCard>
          </div>
        </section>
        
        {/* Controls Demo */}
        <section className="mt-12">
          <h2 className="text-2xl font-heading font-bold mb-4">Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Turntable Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <Label>Speed Selection</Label>
                  <RadioGroup
                    defaultValue={selectedKnob}
                    onValueChange={setSelectedKnob}
                    className="flex gap-6 justify-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <AnimatedRadioGroupKnob value="speed-33" id="speed-33" />
                      <Label htmlFor="speed-33">33⅓ RPM</Label>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <AnimatedRadioGroupKnob value="speed-45" id="speed-45" />
                      <Label htmlFor="speed-45">45 RPM</Label>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <AnimatedRadioGroupKnob value="speed-78" id="speed-78" />
                      <Label htmlFor="speed-78">78 RPM</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-4">
                  <Label>Pitch Control</Label>
                  <AnimatedSlider
                    variant="pitchControl"
                    defaultValue={sliderValue}
                    max={10}
                    step={0.1}
                    onValueChange={setSliderValue}
                  />
                  <div className="flex justify-between text-sm">
                    <span>-5%</span>
                    <Badge variant="outline" className="font-mono">
                      {sliderValue[0].toFixed(1)}%
                    </Badge>
                    <span>+5%</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label>Volume</Label>
                  <AnimatedSlider
                    defaultValue={volumeValue}
                    max={100}
                    step={1}
                    onValueChange={setVolumeValue}
                  />
                  <div className="flex justify-between">
                    <span>Min</span>
                    <Badge variant="outline" className="font-mono">
                      {volumeValue[0]}%
                    </Badge>
                    <span>Max</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Form Elements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <AnimatedInput 
                    id="username" 
                    placeholder="Enter your username"
                    variant="default"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Inset Style)</Label>
                  <AnimatedInput 
                    id="email" 
                    type="email"
                    placeholder="Enter your email"
                    variant="inset"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password (Metallic Style)</Label>
                  <AnimatedInput 
                    id="password" 
                    type="password"
                    placeholder="Enter your password"
                    variant="metallic"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <AnimatedCheckbox 
                    id="remember-me" 
                    checked={isToggled}
                    onCheckedChange={(checked) => setIsToggled(checked as boolean)}
                  />
                  <label
                    htmlFor="remember-me"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Remember me
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
        
        {/* LED Indicators Demo */}
        <section className="mt-12">
          <h2 className="text-2xl font-heading font-bold mb-4">LED Indicators</h2>
          <Card>
            <CardContent className="py-6">
              <div className="flex flex-wrap gap-3">
                <Badge variant="success" led="on">Success Indicator</Badge>
                <Badge variant="error" led="on">Error Indicator</Badge>
                <Badge variant="info" led="on">Info Indicator</Badge>
                <Badge variant="warning" led="on">Warning Indicator</Badge>
                <Badge variant="metallic" led="on" ledColor="success">Custom LED</Badge>
                <Badge variant="outline" led="on" ledColor="error">Custom LED</Badge>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
