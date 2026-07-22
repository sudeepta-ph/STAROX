import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import SplitIntelligence from "@/components/SplitIntelligence";
import type { Starox2Target } from "@/lib/store";

export default function AgentPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const url = searchParams.get("url") || searchParams.get("runtimeUrl") || "";
  const mode = (searchParams.get("mode") as "url" | "github") || "url";

  let starox2Target: Starox2Target | null = null;
  if (agentId === "starox2") {
    if (mode === "github") {
      starox2Target = {
        mode: "github",
        runtimeUrl: searchParams.get("runtimeUrl") || undefined,
        repo: {
          url: searchParams.get("repoUrl") || undefined,
          fullName: searchParams.get("repoName") || undefined,
          description: searchParams.get("repoDescription") || undefined,
          language: searchParams.get("repoLanguage") || undefined,
          defaultBranch: searchParams.get("repoBranch") || undefined,
          visibility: (searchParams.get("repoVisibility") as "public" | "private") || undefined,
          stars: searchParams.get("repoStars") ? Number(searchParams.get("repoStars")) : undefined,
          forks: searchParams.get("repoForks") ? Number(searchParams.get("repoForks")) : undefined,
          updatedAt: searchParams.get("repoUpdatedAt") || undefined,
        },
      };
    } else {
      starox2Target = { mode: "url", url: url || undefined };
    }
  }

  const agentMode = agentId === "starox2" ? "starox2" : agentId === "starox1" ? "starox1" : "split";

  const handleBack = () => navigate("/pmx");

  const viewerUrl = url || searchParams.get("runtimeUrl") || searchParams.get("repoUrl") || "";

  return (
    <SplitIntelligence
      url={viewerUrl}
      onBack={handleBack}
      agentMode={agentMode as "split" | "starox1" | "starox2"}
      starox2Target={starox2Target}
    />
  );
}
