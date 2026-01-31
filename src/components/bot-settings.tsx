"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BotSettingsData {
  postFrequency: number;
  tone: string;
  personality: string;
}

interface MetalPricesCache {
  lastUpdated: string | null;
  prices: {
    XAU: number | null;
    XAG: number | null;
  };
  base: string;
}

const DEFAULT_SETTINGS: BotSettingsData = {
  postFrequency: 30,
  tone: "casual",
  personality: "",
};

export function BotSettings() {
  const [postFrequency, setPostFrequency] = useState([180]);
  const [tone, setTone] = useState("casual");
  const [personality, setPersonality] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metalPrices, setMetalPrices] = useState<MetalPricesCache | null>(null);
  const [metalPricesLoading, setMetalPricesLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) {
          throw new Error('Failed to load settings');
        }
        const data: BotSettingsData = await response.json();
        setPostFrequency([150]); // Always set to 150 min
        setTone(data.tone);
        setPersonality(data.personality);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Load metal prices cache on mount
  useEffect(() => {
    async function loadMetalPrices() {
      try {
        const response = await fetch('/api/metal-prices');
        if (!response.ok) {
          throw new Error('Failed to load metal prices');
        }
        const data: MetalPricesCache = await response.json();
        setMetalPrices(data);
      } catch (err) {
        console.error('Failed to load metal prices:', err);
      } finally {
        setMetalPricesLoading(false);
      }
    }
    loadMetalPrices();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postFrequency: 150, // Always save 150 min
          tone,
          personality,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      // Success - could show a toast notification here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPostFrequency([150]); // Always reset to 150 min
    setTone(DEFAULT_SETTINGS.tone);
    setPersonality(DEFAULT_SETTINGS.personality);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-xl space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Bot Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your X bot
          </p>
        </header>

        <div className="space-y-6">
          {/* Post Frequency */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Post Frequency</CardTitle>
              <CardDescription>How often the bot posts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Interval</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {postFrequency[0]} min
                </span>
              </div>
              <Slider
                value={postFrequency}
                onValueChange={setPostFrequency}
                min={5}
                max={200}
                step={5}
                disabled={true}
              />
            </CardContent>
          </Card>

          {/* Style & Voice */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Style & Voice</CardTitle>
              <CardDescription>How the bot communicates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="witty">Witty</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personality">Personality</Label>
                <Textarea
                  id="personality"
                  placeholder="Describe how the bot should talk, its quirks, topics it likes..."
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about the voice and style you want
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Metal Prices Cache */}
          {/* <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Metal Prices Cache</CardTitle>
              <CardDescription>Cached metal prices updated at 8am and 8pm SGT</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {metalPricesLoading ? (
                <div className="text-sm text-muted-foreground">Loading prices...</div>
              ) : metalPrices ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Gold (XAU)</Label>
                      <span className="text-sm tabular-nums font-medium">
                        {metalPrices.prices.XAU !== null
                          ? `$${metalPrices.prices.XAU.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Silver (XAG)</Label>
                      <span className="text-sm tabular-nums font-medium">
                        {metalPrices.prices.XAG !== null
                          ? `$${metalPrices.prices.XAG.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                  {metalPrices.lastUpdated && (
                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      Last updated: {new Date(metalPrices.lastUpdated).toLocaleString('en-US', { timeZone: 'Asia/Singapore' })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No cached prices available</div>
              )}
            </CardContent>
          </Card> */}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={loading || saving}
            >
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
