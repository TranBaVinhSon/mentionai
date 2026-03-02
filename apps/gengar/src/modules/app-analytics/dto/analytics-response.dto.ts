export interface DailyMetric {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
}

export interface CountryData {
  country: string;
  count: number;
}

export class AnalyticsResponseDto {
  totalPageViews: number;
  totalUniqueVisitors: number;
  totalConversations: number;
  totalMessages: number;
  dailyMetrics: DailyMetric[];
  countryDistribution: CountryData[];
  startDate: string;
  endDate: string;
}
