import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Image,
  FileText,
  Check,
  Loader2,
  MapPin,
  Calendar,
  Leaf,
  X,
  Sparkles,
  Send,
} from "lucide-react";
import { ProjectType } from "@/types";
import {
  createProject as createProjectInFirestore,
  uploadProjectFile,
  saveACVAReport,
  updateProjectWithReport,
} from "@/lib/firestore-projects";
import { generateACVAReport } from "@/lib/gemini";
import { collection, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const projectTypes: { value: ProjectType; label: string }[] = [
  { value: "reforestation", label: "Reforestation" },
  { value: "renewable_energy", label: "Renewable Energy" },
  { value: "methane_capture", label: "Methane Capture" },
  { value: "ocean_conservation", label: "Ocean Conservation" },
  { value: "soil_carbon", label: "Soil Carbon Sequestration" },
  { value: "avoided_deforestation", label: "Avoided Deforestation" },
  { value: "clean_cookstoves", label: "Clean Cookstoves" },
  { value: "other", label: "Other" },
];

const steps = [
  { id: 1, title: "Basic Info", description: "Project details" },
  { id: 2, title: "Documentation", description: "Upload docs" },
  { id: 3, title: "Photos", description: "Project images" },
  { id: 4, title: "Review", description: "Final check" },
  { id: 5, title: "ACVA Report", description: "Generate & submit" },
];

export default function CreateProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSubmittingACVA, setIsSubmittingACVA] = useState(false);
  const [acvaReportContent, setAcvaReportContent] = useState("");
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProjectType | "">("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [volume, setVolume] = useState("");
  const [startDate, setStartDate] = useState("");
  const [monitoringPlan, setMonitoringPlan] = useState("");
  
  // Files
  const [govApprovalDoc, setGovApprovalDoc] = useState<File | null>(null);
  const [complianceDoc, setComplianceDoc] = useState<File | null>(null);
  const [invoices, setInvoices] = useState<File[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files].slice(0, 10));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const pid = doc(collection(db, "projects")).id;
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadProjectFile(pid, "photos", photos[i]);
        photoUrls.push(url);
      }
      const govUrl = govApprovalDoc
        ? await uploadProjectFile(pid, "docs", govApprovalDoc)
        : undefined;
      const complianceUrl = complianceDoc
        ? await uploadProjectFile(pid, "docs", complianceDoc)
        : undefined;
      const id = await createProjectInFirestore(
        {
          sellerId: user.id,
          name,
          description,
          type: type as ProjectType,
          location: { country, region },
          startDate: startDate ? new Date(startDate) : new Date(),
          volumeTCO2e: Number(volume) || 0,
          monitoringPlan,
          governmentApprovalDocUrl: govUrl,
          complianceDocUrl: complianceUrl,
          photoUrls,
          complianceStatus: complianceDoc ? "compliant" : "pending",
        },
        pid
      );
      setCreatedProjectId(id);
      toast({
        title: "Project created!",
        description: "Now generate your ACVA report and submit for verification.",
      });
      setCurrentStep(5);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create project";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setAcvaReportContent("");
    try {
      const report = await generateACVAReport({
        name,
        description,
        type: type as ProjectType,
        country,
        region,
        volumeTCO2e: Number(volume) || 0,
        startDate,
        monitoringPlan,
        complianceStatus: complianceDoc ? "compliant" : "pending",
      });
      setAcvaReportContent(report);
      toast({ title: "Report generated", description: "ACVA-format report ready. Review and submit." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate report";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSubmitToACVA = async () => {
    if (!createdProjectId || !acvaReportContent) {
      toast({
        title: "Generate report first",
        description: "Generate the ACVA report before submitting.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmittingACVA(true);
    try {
      const reportId = await saveACVAReport(createdProjectId, acvaReportContent, "submitted");
      await updateProjectWithReport(createdProjectId, reportId, "under_review");
      // Mock ACVA submission - in production would call real API or redirect
      await new Promise((r) => setTimeout(r, 1500));
      toast({
        title: "Submitted to ACVA",
        description: "Your report has been submitted for third-party verification.",
      });
      navigate("/seller");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsSubmittingACVA(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          className="gap-2 mb-4"
          onClick={() => navigate("/seller")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="font-display text-3xl font-bold">
          Create New <span className="text-gradient-primary">Project</span>
        </h1>
        <p className="text-muted-foreground">
          Add a new carbon credit project to your portfolio
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="text-center">
              <div
                className={`flex items-center justify-center h-10 w-10 rounded-full font-semibold transition-colors mx-auto ${
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
              <p className="text-xs mt-1 text-muted-foreground">{step.title}</p>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-1 w-16 mx-2 rounded ${
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      <Card variant="glass" className="max-w-3xl mx-auto">
        <CardContent className="p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Amazon Basin Reforestation Initiative"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Project Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as ProjectType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((pt) => (
                      <SelectItem key={pt.value} value={pt.value}>
                        {pt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your carbon credit project..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g., Brazil"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g., Amazon Basin"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="volume">Volume (tCO2e)</Label>
                  <Input
                    id="volume"
                    type="number"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    placeholder="e.g., 2500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Government Approval Document</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="govApproval"
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => setGovApprovalDoc(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="govApproval" className="cursor-pointer">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    {govApprovalDoc ? (
                      <p className="text-primary font-medium">{govApprovalDoc.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Upload PDF</p>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Compliance Check Document</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="compliance"
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => setComplianceDoc(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="compliance" className="cursor-pointer">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    {complianceDoc ? (
                      <p className="text-primary font-medium">{complianceDoc.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Upload PDF</p>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monitoring">Monitoring Plan Description</Label>
                <Textarea
                  id="monitoring"
                  value={monitoringPlan}
                  onChange={(e) => setMonitoringPlan(e.target.value)}
                  placeholder="Describe your monitoring and verification methodology..."
                  rows={4}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Project Photos (up to 10)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="photos"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                  />
                  <label htmlFor="photos" className="cursor-pointer">
                    <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="font-medium">Click to upload photos</p>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG (max 5MB each)
                    </p>
                  </label>
                </div>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="font-display text-xl font-semibold">Review Your Project</h3>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="h-4 w-4 text-primary" />
                    <span className="font-medium">Project Details</span>
                  </div>
                  <p className="text-lg font-semibold">{name || "Untitled Project"}</p>
                  <p className="text-sm text-muted-foreground">{description || "No description"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-medium">Location</span>
                    </div>
                    <p>{region}, {country}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">Volume</span>
                    </div>
                    <p>{Number(volume).toLocaleString()} tCO2e</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <span className="font-medium">Documents</span>
                  <div className="flex gap-4 mt-2">
                    <span className="text-sm">
                      {govApprovalDoc ? "✓ Gov Approval" : "✗ Gov Approval"}
                    </span>
                    <span className="text-sm">
                      {complianceDoc ? "✓ Compliance" : "✗ Compliance"}
                    </span>
                    <span className="text-sm">
                      {photos.length} Photos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <h3 className="font-display text-xl font-semibold">ACVA Verification Report</h3>
              <p className="text-sm text-muted-foreground">
                Generate a structured report in ACVA format using AI, then submit for third-party verification.
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="hero"
                  className="gap-2"
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                >
                  {isGeneratingReport ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate ACVA Report
                </Button>
                {acvaReportContent && (
                  <Button
                    type="button"
                    variant="default"
                    className="gap-2"
                    onClick={handleSubmitToACVA}
                    disabled={isSubmittingACVA}
                  >
                    {isSubmittingACVA ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Submit to ACVA
                  </Button>
                )}
              </div>
              {acvaReportContent && (
                <div className="space-y-2">
                  <Label>Generated Report</Label>
                  <Textarea
                    readOnly
                    value={acvaReportContent}
                    rows={14}
                    className="font-mono text-sm bg-muted/30"
                  />
                </div>
              )}
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

            {currentStep < 4 ? (
              <Button variant="hero" onClick={handleNext} className="gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : currentStep === 4 ? (
              <Button
                variant="hero"
                onClick={handleSubmit}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create Project & Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate("/seller")}
                className="gap-2"
              >
                Back to Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
