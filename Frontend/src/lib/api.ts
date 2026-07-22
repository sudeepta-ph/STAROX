// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // File upload with FormData
  private async uploadFormData<T>(
    endpoint: string,
    formData: FormData
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {};

    if (this.authToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      console.error('File upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // Analysis endpoints
  async analyzeWebsite(url: string, projectId?: string) {
    return this.request<WebsiteAnalysisResult>('/analysis/website', {
      method: 'POST',
      body: JSON.stringify({ url, projectId }),
    });
  }

  async analyzeReviews(reviews: string[], productDescription?: string) {
    return this.request<ReviewAnalysisResult>('/analysis/reviews', {
      method: 'POST',
      body: JSON.stringify({ reviews, productDescription }),
    });
  }

  async runFullAnalysis(params: FullAnalysisParams) {
    return this.request<FullAnalysisResult>('/analysis/full', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async quickAnalysis(url: string) {
    return this.request<QuickAnalysisResult>('/analysis/quick', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // Upload endpoints
  async uploadFile(file: File, projectId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) formData.append('projectId', projectId);

    return this.uploadFormData<FileUploadResult>('/uploads/file', formData);
  }

  async uploadReviews(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.uploadFormData<ReviewsUploadResult>('/uploads/reviews', formData);
  }

  async uploadScreenshot(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.uploadFormData<ScreenshotUploadResult>('/uploads/screenshot', formData);
  }

  // Project endpoints
  async getProjects() {
    return this.request<Project[]>('/projects');
  }

  async getProject(id: string) {
    return this.request<ProjectWithData>(`/projects/${id}`);
  }

  async createProject(name: string, description?: string, websiteUrl?: string) {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description, websiteUrl }),
    });
  }

  async updateProject(id: string, updates: Partial<Project>) {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteProject(id: string) {
    return this.request<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Report endpoints
  async getReports(projectId: string) {
    return this.request<PredictionReport[]>(`/reports/${projectId}`);
  }

  async generateReport(params: GenerateReportParams) {
    return this.request<Report>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async exportReport(report: Report, format: 'markdown' | 'json' = 'markdown') {
    const response = await fetch(`${this.baseUrl}/reports/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
      },
      body: JSON.stringify({ report, format }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  // CDX-1: STAROX-1 Product Intelligence
  async runStarox1(params: {
    userId: string;
    projectId: string;
    model?: string;
    planTier?: 'free' | 'starter' | 'pro';
    websiteUrl?: string;
    productDescription?: string;
    reviews?: string[];
    analyticsContext?: string;
    screenshotText?: string;
  }) {
    const raw = await this.request<{ type: string; data: Starox1Output; model: string; provider: string }>('/cdx1/generate', {
      method: 'POST',
      body: JSON.stringify({
        userId: params.userId,
        projectId: params.projectId,
        model: params.model ?? 'openai/gpt-4o-mini',
        planTier: params.planTier ?? 'free',
        websiteUrl: params.websiteUrl,
        productDescription: params.productDescription,
        reviews: params.reviews,
        analyticsContext: params.analyticsContext,
        screenshotText: params.screenshotText,
      }),
    });
    return raw;
  }
}

// Type definitions
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  website_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithData extends Project {
  analyses: WebsiteAnalysis[];
  suggestions: Suggestion[];
  predictions: PredictionReport[];
}

export interface WebsiteAnalysis {
  id: string;
  project_id: string;
  url: string;
  dom_structure: DOMStructure;
  screenshot_url?: string;
  ocr_text?: string;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface DOMStructure {
  headings: HeadingElement[];
  buttons: ButtonElement[];
  forms: FormElement[];
  ctas: CTAElement[];
  navigation: NavigationElement[];
  images: ImageElement[];
  pageHierarchy: PageHierarchy;
}

export interface HeadingElement {
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  text: string;
  position: ElementPosition;
}

export interface ButtonElement {
  text: string;
  type: 'submit' | 'button' | 'link';
  position: ElementPosition;
  hasHoverState: boolean;
}

export interface FormElement {
  id?: string;
  fieldCount: number;
  requiredFields: number;
  fields: FormField[];
  position: ElementPosition;
}

export interface FormField {
  name: string;
  type: string;
  required: boolean;
  label?: string;
}

export interface CTAElement {
  text: string;
  position: ElementPosition;
  isAboveFold: boolean;
  contrastRatio?: number;
}

export interface NavigationElement {
  type: 'header' | 'footer' | 'sidebar';
  items: NavItem[];
}

export interface NavItem {
  text: string;
  href: string;
}

export interface ImageElement {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface PageHierarchy {
  sections: PageSection[];
  depth: number;
}

export interface PageSection {
  name: string;
  type: 'hero' | 'features' | 'testimonials' | 'pricing' | 'cta' | 'footer' | 'other';
  children: PageSection[];
}

export interface ElementPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Suggestion {
  id: string;
  analysis_id: string;
  project_id: string;
  type: 'ux_issue' | 'ui_improvement' | 'feature_addon' | 'copy_refinement';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  why: string;
  recommendation: string;
  estimated_impact: string;
  complexity: 'low' | 'medium' | 'high';
  priority_score: number;
  element_selector?: string;
  created_at: string;
}

export interface PredictionReport {
  id: string;
  project_id: string;
  analysis_id: string;
  conversion_prediction: number;
  bounce_rate_prediction: number;
  session_duration_prediction: number;
  revenue_projection: number;
  confidence_score: number;
  risk_factors: RiskFactor[];
  opportunities: Opportunity[];
  created_at: string;
}

export interface RiskFactor {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
}

export interface Opportunity {
  title: string;
  description: string;
  potential_impact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface STAROX1Analysis {
  painPoints: PainPoint[];
  featureGaps: FeatureRequest[];
  sentimentClusters: SentimentCluster[];
  productRisks: RiskFactor[];
  summary: string;
}

export interface PainPoint {
  title: string;
  description: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high';
  relatedReviews: string[];
}

export interface FeatureRequest {
  title: string;
  description: string;
  frequency: number;
  priority: 'low' | 'medium' | 'high';
}

export interface SentimentCluster {
  topic: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  sampleReviews: string[];
}

export interface STAROX2Analysis {
  uxWeaknesses: Suggestion[];
  ctaImprovements: Suggestion[];
  structuralSuggestions: Suggestion[];
  copyRefinements: Suggestion[];
  featureRecommendations: Suggestion[];
  summary: string;
}

export interface RoadmapItem {
  week: number;
  title: string;
  tasks: string[];
  expectedImpact: string;
}

// API Response types
export interface WebsiteAnalysisResult {
  url: string;
  metadata: {
    title: string;
    description: string;
    viewport: { width: number; height: number };
  };
  domStructure: DOMStructure;
  analysis: STAROX2Analysis;
  predictions: PredictionReport;
  roadmap: RoadmapItem[];
  quickAnalysis: Partial<STAROX2Analysis>;
}

export interface ReviewAnalysisResult {
  reviewCount: number;
  analysis: STAROX1Analysis;
}

export interface FullAnalysisParams {
  url: string;
  reviews?: string[];
  analyticsData?: Record<string, any>;
  productDescription?: string;
  projectId?: string;
}

export interface FullAnalysisResult {
  url: string;
  metadata: {
    title: string;
    description: string;
    viewport: { width: number; height: number };
  };
  starox1: STAROX1Analysis | null;
  starox2: STAROX2Analysis;
  predictions: PredictionReport;
  roadmap: RoadmapItem[];
}

export interface QuickAnalysisResult {
  url: string;
  metadata: {
    title: string;
    description: string;
  };
}

export interface FileUploadResult {
  fileName: string;
  fileType: 'csv' | 'pdf' | 'image' | 'analytics';
  fileSize: number;
  parsedData: any;
  savedFile: any;
}

export interface ReviewsUploadResult {
  fileName: string;
  totalRows: number;
  extractedReviews: number;
  reviews: string[];
  rawData: any[];
}

export interface ScreenshotUploadResult {
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl: string;
}

export interface GenerateReportParams {
  projectId?: string;
  analysisId?: string;
  starox1Analysis?: STAROX1Analysis;
  starox2Analysis?: STAROX2Analysis;
  predictions?: PredictionReport;
  includeRoadmap?: boolean;
  includeExecutiveSummary?: boolean;
}

export interface Report {
  generatedAt: string;
  executiveSummary: string | null;
  uxFindings: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    items: any[];
  };
  recommendedChanges: {
    uiImprovements: any[];
    copyRefinements: any[];
    featureAdditions: any[];
  };
  impactForecast: {
    conversionRate: string;
    bounceRate: string;
    sessionDuration: string;
    revenue: string;
    confidenceScore: number;
  } | null;
  implementationRoadmap: RoadmapItem[] | null;
  productInsights: {
    painPoints: PainPoint[];
    featureGaps: FeatureRequest[];
    risks: RiskFactor[];
  } | null;
}

// ── STAROX-1 task type (shared across feature recommendations and execution plan)
export interface S1Task {
  task: string;
  milestone: "MVP" | "Beta" | "GA" | string;
  agentPrompt?: string;
}

// ── STAROX-1 feature recommendation (enriched with architecture + execution fields)
export interface S1Feature {
  feature: string;
  whatItIs?: string;
  solves?: string[];
  why: string;
  whyThisWorks?: string;
  expectedImpact?: string;
  evidence?: string[];
  effort: string;
  // Architecture mapping (per STAROX-1 spec)
  ui_changes?: string[];
  backend_changes?: string[];
  api_changes?: string[];
  data_model_changes?: string[];
  workflow_changes?: string[];
  // Execution planning (per STAROX-1 spec)
  tasks?: S1Task[];
}

// ── STAROX-1 execution plan decision (strict spec format)
export interface S1Decision {
  feature: string;
  problem: string;
  why: string[];
  impact: string;
  priority: "P0" | "P1" | "P2";
  ui_changes: string[];
  data_model_changes: string[];
  workflow_changes: string[];
  tasks: S1Task[];
}

// ── STAROX-1 structured output type ───────────────────────────────────────────
export interface Starox1Output {
  // Operating mode (Reactive or Proactive)
  mode?: "reactive" | "proactive";
  keyInsights?: Array<{
    insight: string;
    evidence: string;
    interpretation: string;
  }>;
  productSummary: {
    name: string;
    oneLiner: string;
    category: string;
    stage: "idea" | "mvp" | "growth" | "scale";
  };
  targetUsers: Array<{ persona: string; painPoint: string; goal: string }>;
  problemsIdentified: Array<{
    problem: string;
    severity: string;
    evidence?: string[];
    rootCause?: string;
    impact: string;
  }>;
  featureRecommendations: {
    p0: S1Feature[];
    p1: S1Feature[];
    p2: S1Feature[];
  };
  // Execution plan: top-level decisions array (per STAROX-1 spec output format)
  executionPlan?: {
    decisions: S1Decision[];
  };
  evidenceMapping?: {
    problemToEvidence: Array<{
      problem: string;
      evidenceSource: "feedback" | "analytics" | "screenshots" | "mixed";
      evidence: string[];
    }>;
    featureToProblem: Array<{
      feature: string;
      problemsSolved: string[];
    }>;
  };
  strategicTakeaways?: string[];
  marketAnalysis: {
    marketSize: string;
    competitors: Array<{ name: string; weakness: string }>;
    differentiationStrategy: string;
    marketGaps: string[];
  };
  architecturePlan: {
    recommendedStack: { frontend: string; backend: string; database: string; infra: string };
    modules: Array<{ name: string; purpose: string }>;
    scalingConsiderations: string[];
  };
  roadmap: {
    mvp: { timeline: string; features: string[]; why?: string; expectedOutcome?: string; successMetric: string };
    v1: { timeline: string; features: string[]; why?: string; expectedOutcome?: string; successMetric: string };
    scale: { timeline: string; features: string[]; why?: string; expectedOutcome?: string; successMetric: string };
  };
  strategicInsights: {
    monetizationIdeas: string[];
    scalingOpportunities: string[];
    productDirection: string;
    keyRisks: string[];
  };
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);
export default api;
