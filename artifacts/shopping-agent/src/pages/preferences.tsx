import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useGetPreferences, useUpdatePreferences } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AVAILABLE_SOURCES = ["Amazon", "Flipkart", "BestBuy", "Walmart"];
const AVAILABLE_CATEGORIES = ["Electronics", "Fashion", "Home & Kitchen", "Beauty", "Sports"];

export default function PreferencesPage() {
  const { data: preferences, isLoading } = useGetPreferences();
  const updateMutation = useUpdatePreferences();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    favoriteBrands: "",
    preferredSources: [] as string[],
    defaultCurrency: "USD",
    preferredCategories: [] as string[],
    budgetMin: "",
    budgetMax: ""
  });

  useEffect(() => {
    if (preferences) {
      setFormData({
        favoriteBrands: preferences.favoriteBrands.join(", "),
        preferredSources: preferences.preferredSources,
        defaultCurrency: preferences.defaultCurrency || "USD",
        preferredCategories: preferences.preferredCategories,
        budgetMin: preferences.budgetRange?.min?.toString() || "",
        budgetMax: preferences.budgetRange?.max?.toString() || ""
      });
    }
  }, [preferences]);

  const handleSourceToggle = (source: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      preferredSources: checked 
        ? [...prev.preferredSources, source]
        : prev.preferredSources.filter(s => s !== source)
    }));
  };

  const handleCategoryToggle = (cat: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      preferredCategories: checked 
        ? [...prev.preferredCategories, cat]
        : prev.preferredCategories.filter(c => c !== cat)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      data: {
        favoriteBrands: formData.favoriteBrands.split(",").map(s => s.trim()).filter(Boolean),
        preferredSources: formData.preferredSources,
        defaultCurrency: formData.defaultCurrency,
        preferredCategories: formData.preferredCategories,
        budgetMin: formData.budgetMin ? Number(formData.budgetMin) : null,
        budgetMax: formData.budgetMax ? Number(formData.budgetMax) : null
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Preferences saved",
          description: "Your shopping preferences have been updated.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to save preferences.",
          variant: "destructive"
        });
      }
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Shopping Preferences</h1>
          <p className="text-muted-foreground">Customize your AI agent to get better personalized recommendations.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General</CardTitle>
                <CardDescription>Basic settings for your shopping experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select 
                    value={formData.defaultCurrency} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, defaultCurrency: val }))}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brands">Favorite Brands</Label>
                  <Input 
                    id="brands" 
                    placeholder="e.g. Apple, Sony, Nike (comma separated)"
                    value={formData.favoriteBrands}
                    onChange={(e) => setFormData(prev => ({ ...prev, favoriteBrands: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Profile</CardTitle>
                <CardDescription>Let the AI know your typical spending comfort zone</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="min-budget">Min Budget</Label>
                    <Input 
                      id="min-budget" 
                      type="number"
                      placeholder="0"
                      value={formData.budgetMin}
                      onChange={(e) => setFormData(prev => ({ ...prev, budgetMin: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="max-budget">Max Budget</Label>
                    <Input 
                      id="max-budget" 
                      type="number"
                      placeholder="1000"
                      value={formData.budgetMax}
                      onChange={(e) => setFormData(prev => ({ ...prev, budgetMax: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sources & Categories</CardTitle>
                <CardDescription>Where do you like to shop and what do you usually buy?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Preferred Stores</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_SOURCES.map(source => (
                      <label key={source} className="flex items-center space-x-2 cursor-pointer p-2 border border-border rounded hover:bg-muted/50">
                        <Checkbox 
                          checked={formData.preferredSources.includes(source)}
                          onCheckedChange={(c) => handleSourceToggle(source, c as boolean)}
                        />
                        <span className="text-sm font-medium">{source}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Preferred Categories</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_CATEGORIES.map(cat => (
                      <label key={cat} className="flex items-center space-x-2 cursor-pointer p-2 border border-border rounded hover:bg-muted/50">
                        <Checkbox 
                          checked={formData.preferredCategories.includes(cat)}
                          onCheckedChange={(c) => handleCategoryToggle(cat, c as boolean)}
                        />
                        <span className="text-sm font-medium">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending} size="lg">
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Preferences
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
