import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Building,
  FileText,
  Upload,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Industry } from "@/types";

const steps = [
  { id: 1, title: "Company Details", description: "Basic information" },
  { id: 2, title: "KYC Documents", description: "Verification docs" },
  { id: 3, title: "Emissions Setup", description: "Baseline data" },
];

const industries: { value: Industry; label: string }[] = [
  { value: "manufacturing", label: "Manufacturing" },
  { value: "energy", label: "Energy" },
  { value: "transportation", label: "Transportation" },
  { value: "construction", label: "Construction" },
  { value: "agriculture", label: "Agriculture" },
  { value: "chemicals", label: "Chemicals" },
  { value: "metals", label: "Metals & Mining" },
  { value: "textiles", label: "Textiles" },
  { value: "food_processing", label: "Food Processing" },
  { value: "other", label: "Other" },
];

export default function BuyerOnboarding() {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [industry, setIndustry] = useState<Industry | "">(
    (user as any)?.industry || ""
  );
  const [employees, setEmployees] = useState("");
  const [taxId, setTaxId] = useState("");
  const [businessRegFile, setBusinessRegFile] = useState<File | null>(null);
  const [taxIdFile, setTaxIdFile] = useState<File | null>(null);
  const [emissionsBaseline, setEmissionsBaseline] = useState("");
  const [offsetTarget, setOffsetTarget] = useState("");
  const [targetYear, setTargetYear] = useState("2030");

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await updateUserProfile({
        companyName,
        industry: industry as Industry,
        kycStatus: "submitted",
        ...(emissionsBaseline ? { emissionsBaseline: Number(emissionsBaseline) } : {}),
        ...(offsetTarget ? { offsetTarget: Number(offsetTarget) } : {}),
        ...(targetYear ? { targetYear: Number(targetYear) } : {}),
      });

      toast({
        title: "Onboarding complete!",
        description: "Your KYC is being verified. You'll be approved in a moment.",
      });

      setTimeout(async () => {
        await updateUserProfile({ kycStatus: "approved" });
        toast({
          title: "KYC approved",
          description: "Your verification is complete. You have full marketplace access.",
        });
      }, 2000);

      navigate("/buyer");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center h-10 w-10 rounded-full font-semibold transition-colors ${
                  currentStep >= step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 w-24 mx-2 rounded ${
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold">
            {steps[currentStep - 1].title}
          </h2>
          <p className="text-muted-foreground">
            {steps[currentStep - 1].description}
          </p>
        </div>
      </div>

      {/* Step Content */}
      <Card variant="glass">
        <CardContent className="p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company Ltd."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={industry}
                  onValueChange={(v) => setIndustry(v as Industry)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>
                        {ind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employees">Number of Employees</Label>
                <Select value={employees} onValueChange={setEmployees}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-50">1-50</SelectItem>
                    <SelectItem value="51-200">51-200</SelectItem>
                    <SelectItem value="201-500">201-500</SelectItem>
                    <SelectItem value="501-1000">501-1000</SelectItem>
                    <SelectItem value="1000+">1000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID / Registration Number</Label>
                <Input
                  id="taxId"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="Enter your tax ID"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Business Registration Certificate</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="businessReg"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setBusinessRegFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="businessReg" className="cursor-pointer">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    {businessRegFile ? (
                      <p className="text-primary font-medium">{businessRegFile.name}</p>
                    ) : (
                      <>
                        <p className="font-medium mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-muted-foreground">
                          PDF, JPG, or PNG (max 10MB)
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tax ID Document</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="taxIdDoc"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setTaxIdFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="taxIdDoc" className="cursor-pointer">
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    {taxIdFile ? (
                      <p className="text-primary font-medium">{taxIdFile.name}</p>
                    ) : (
                      <>
                        <p className="font-medium mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-muted-foreground">
                          PDF, JPG, or PNG (max 10MB)
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="baseline">
                  Annual Emissions Baseline (tCO2e)
                </Label>
                <Input
                  id="baseline"
                  type="number"
                  value={emissionsBaseline}
                  onChange={(e) => setEmissionsBaseline(e.target.value)}
                  placeholder="e.g., 15000"
                />
                <p className="text-sm text-muted-foreground">
                  Your company's annual carbon emissions in tonnes of CO2 equivalent
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target">Offset Target (tCO2e)</Label>
                <Input
                  id="target"
                  type="number"
                  value={offsetTarget}
                  onChange={(e) => setOffsetTarget(e.target.value)}
                  placeholder="e.g., 5000"
                />
                <p className="text-sm text-muted-foreground">
                  Your target for net emissions after offsetting
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetYear">Target Year</Label>
                <Select value={targetYear} onValueChange={setTargetYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2030">2030</SelectItem>
                    <SelectItem value="2035">2035</SelectItem>
                    <SelectItem value="2040">2040</SelectItem>
                    <SelectItem value="2050">2050</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {currentStep < 3 ? (
              <Button variant="hero" onClick={handleNext} className="gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="hero"
                onClick={handleComplete}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Complete Setup
                    <Check className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
