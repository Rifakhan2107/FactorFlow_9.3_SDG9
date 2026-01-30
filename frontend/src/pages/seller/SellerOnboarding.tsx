import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Building,
  FileText,
  Upload,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
} from "lucide-react";

const steps = [
  { id: 1, title: "Organization Details", description: "Basic info" },
  { id: 2, title: "Verification Docs", description: "ACVA certificates" },
  { id: 3, title: "Portfolio", description: "Your projects" },
];

export default function SellerOnboarding() {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [portfolioDescription, setPortfolioDescription] = useState("");
  const [acvaCertificate, setAcvaCertificate] = useState<File | null>(null);
  const [ownershipDoc, setOwnershipDoc] = useState<File | null>(null);
  const [regulatoryDoc, setRegulatoryDoc] = useState<File | null>(null);

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
        kycStatus: "submitted",
      });

      toast({
        title: "Verification submitted!",
        description: "Your KYC is being verified. You'll be approved in a moment.",
      });

      setTimeout(async () => {
        await updateUserProfile({ kycStatus: "approved" });
        toast({
          title: "KYC approved",
          description: "Your verification is complete.",
        });
      }, 2000);

      navigate("/seller");
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
                <Label htmlFor="companyName">Organization Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Organization"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regNumber">Registration Number</Label>
                <Input
                  id="regNumber"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="Company registration number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="portfolio">Portfolio Description</Label>
                <Textarea
                  id="portfolio"
                  value={portfolioDescription}
                  onChange={(e) => setPortfolioDescription(e.target.value)}
                  placeholder="Describe your carbon credit projects and experience..."
                  rows={4}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>ACVA Verification Certificate</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="acvaCert"
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => setAcvaCertificate(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="acvaCert" className="cursor-pointer">
                    <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    {acvaCertificate ? (
                      <p className="text-primary font-medium">{acvaCertificate.name}</p>
                    ) : (
                      <>
                        <p className="font-medium mb-1">Upload ACVA Certificate</p>
                        <p className="text-sm text-muted-foreground">PDF only</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ownership Documents</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="ownershipDoc"
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => setOwnershipDoc(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="ownershipDoc" className="cursor-pointer">
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    {ownershipDoc ? (
                      <p className="text-primary font-medium">{ownershipDoc.name}</p>
                    ) : (
                      <>
                        <p className="font-medium mb-1">Upload Ownership Proof</p>
                        <p className="text-sm text-muted-foreground">PDF only</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Regulatory Compliance Documents</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="regulatoryDoc"
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => setRegulatoryDoc(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="regulatoryDoc" className="cursor-pointer">
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    {regulatoryDoc ? (
                      <p className="text-primary font-medium">{regulatoryDoc.name}</p>
                    ) : (
                      <>
                        <p className="font-medium mb-1">Upload Regulatory Docs</p>
                        <p className="text-sm text-muted-foreground">PDF only</p>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 text-center">
              <div className="h-20 w-20 rounded-full bg-success/20 mx-auto flex items-center justify-center">
                <Check className="h-10 w-10 text-success" />
              </div>
              <h3 className="font-display text-xl font-semibold">
                Ready to Submit!
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your organization details and verification documents will be
                reviewed by our team. You'll be notified once approved.
              </p>
              <div className="p-4 rounded-lg bg-muted/30 text-left">
                <p className="font-medium mb-2">What happens next:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Documents reviewed within 2-3 business days</li>
                  <li>• Email notification upon approval</li>
                  <li>• Start creating carbon credit projects</li>
                  <li>• Generate AI-powered ACVA reports</li>
                </ul>
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
                    Submit for Review
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
