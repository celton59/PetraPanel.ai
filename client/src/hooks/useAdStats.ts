import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// Tipos para datos de estadísticas de anuncios
export interface AffiliateCompanyStat {
  companyId: number;
  companyName: string;
  status: string;
  matchCount: number;
  includedCount: number;
  pendingCount: number;
  conversionRate: number;
  estimatedRevenue: number;
}

export interface ProjectAffiliateStat {
  companyId: number;
  companyName: string;
  projectId: number;
  projectName: string;
  projectPrefix: string;
  matchCount: number;
  includedCount: number;
  pendingCount: number;
}

export interface MonthlyAffiliateStat {
  month: string;
  totalMatches: number;
  includedCount: number;
  pendingCount: number;
  conversionRate: number;
}

export interface VideoWithAffiliate {
  videoId: number;
  videoTitle: string;
  projectId: number;
  projectName: string;
  affiliateCount: number;
  includedCount: number;
  createdAt: string;
  videoStatus: string;
  creatorName: string;
}

export interface TopPerformingCompany {
  companyId: number;
  companyName: string;
  status: string;
  matchCount: number;
  includedCount: number;
  conversionRate: number;
}

export interface OverallAdStats {
  totalMatchedVideos: number;
  totalIncludedLinks: number;
  overallConversionRate: number;
  totalAffiliateCompanies: number;
  activeAffiliateCompanies: number;
}

export interface AdStatsData {
  overallStats: OverallAdStats;
  affiliateStats: AffiliateCompanyStat[];
  projectAffiliateStats: ProjectAffiliateStat[];
  monthlyAffiliateStats: MonthlyAffiliateStat[];
  topVideosWithAffiliates: VideoWithAffiliate[];
  topPerformingCompanies: TopPerformingCompany[];
}

/**
 * Hook para obtener estadísticas detalladas de anuncios y afiliados
 */
export function useAdStats() {
  return useQuery<AdStatsData>({
    queryKey: ["ad-stats"],
    queryFn: async () => {
      try {
        const { data } = await axios.get<AdStatsData>('/api/stats/ads');
        return data;
      } catch (error) {
        console.error("Error fetching ad statistics:", error);
        throw error;
      }
    },
    staleTime: 60 * 1000, // 1 minuto
    refetchOnWindowFocus: false
  });
}

// Tipos para estadísticas específicas de una empresa afiliada
export interface CompanyInfo {
  id: number;
  name: string;
  status: string;
  domain: string;
  baseRate: number;
  keywordRegex: string;
  createdat: string;
}

export interface CompanyOverallStats {
  totalMatches: number;
  includedMatches: number;
  pendingMatches: number;
  conversionRate: number;
  estimatedRevenue: number;
}

export interface CompanyProjectStat {
  projectId: number;
  projectName: string;
  projectPrefix: string;
  matchCount: number;
  includedCount: number;
  pendingCount: number;
  conversionRate: number;
}

export interface CompanyCreatorStat {
  creatorId: number;
  creatorName: string;
  creatorUsername: string;
  matchCount: number;
  includedCount: number;
  pendingCount: number;
  conversionRate: number;
}

export interface CompanyVideo {
  videoId: number;
  videoTitle: string;
  projectId: number;
  projectName: string;
  included: boolean;
  createdAt: string;
  videoStatus: string;
  creatorName: string;
  optimizerName: string | null;
}

export interface CompanyAdStatsData {
  company: CompanyInfo;
  overallStats: CompanyOverallStats;
  projectStats: CompanyProjectStat[];
  monthlyStats: MonthlyAffiliateStat[];
  creatorStats: CompanyCreatorStat[];
  videoList: CompanyVideo[];
}

/**
 * Hook para obtener estadísticas detalladas de una empresa afiliada específica
 */
export function useCompanyAdStats(companyId: number | null) {
  return useQuery<CompanyAdStatsData>({
    queryKey: ["company-ad-stats", companyId],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("ID de empresa no proporcionado");
      }
      
      try {
        const { data } = await axios.get<CompanyAdStatsData>(`/api/stats/ads/company/${companyId}`);
        return data;
      } catch (error) {
        console.error(`Error fetching stats for company ID ${companyId}:`, error);
        throw error;
      }
    },
    enabled: companyId !== null,
    staleTime: 60 * 1000, // 1 minuto
    refetchOnWindowFocus: false
  });
}