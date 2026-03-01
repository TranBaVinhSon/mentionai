import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { AnalyticsResponseDto } from "./dto/analytics-response.dto";
import Rollbar from "rollbar";
import { ROLLBAR_TOKEN } from "src/config/rollbar.provider";

interface PostHogEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  distinct_id: string;
}

interface PostHogInsightResult {
  data: Array<{
    label: string;
    count: number;
    data: number[];
    labels: string[];
    days: string[];
  }>;
  last_refresh: string;
}

interface PostHogTrendResult {
  result: Array<{
    action: {
      id: string;
      name: string;
    };
    label: string;
    count: number;
    aggregated_value?: number;
    data: number[];
    labels: string[];
    days: string[];
  }>;
}

@Injectable()
export class PostHogService {
  private readonly logger = new Logger(PostHogService.name);
  private readonly apiKey: string;
  private readonly projectId: string;
  private readonly baseUrl: string;
  private readonly personalApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(ROLLBAR_TOKEN) private readonly rollbar: Rollbar,
  ) {
    this.apiKey = this.configService.get<string>("POSTHOG_API_KEY");
    this.projectId = this.configService.get<string>("POSTHOG_PROJECT_ID");
    this.baseUrl = this.configService.get<string>("POSTHOG_API_HOST") || "https://app.posthog.com";
    this.personalApiKey = this.configService.get<string>("POSTHOG_PERSONAL_API_KEY");
  }

  async getAppAnalytics(appUniqueId: string, startDate?: Date, endDate?: Date): Promise<AnalyticsResponseDto> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
      const end = endDate || new Date();

      // Fetch daily views and unique visitors
      const [viewsData, visitorsData, countriesData] = await Promise.all([
        this.getDailyViews(appUniqueId, start, end),
        this.getUniqueVisitors(appUniqueId, start, end),
        this.getCountryDistribution(appUniqueId, start, end),
      ]);

      // Calculate totals
      const totalViews = viewsData.reduce((sum, day) => sum + day.count, 0);
      const totalVisitors = visitorsData.reduce((sum, day) => sum + day.count, 0);

      return {
        totalPageViews: totalViews,
        totalUniqueVisitors: totalVisitors,
        totalConversations: 0, // Will be populated by app-analytics service
        totalMessages: 0, // Will be populated by app-analytics service
        dailyMetrics: this.mergeDailyMetrics(viewsData, visitorsData),
        countryDistribution: countriesData,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch PostHog analytics: ${error.message}`);
      this.rollbar.error("Failed to fetch PostHog analytics", {
        appUniqueId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        error: error.message || String(error),
        stack: error.stack,
      });
      throw error;
    }
  }

  private async getDailyViews(
    appUniqueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; count: number }>> {
    const url = `${this.baseUrl}/api/projects/${this.projectId}/insights/trend/`;

    const body = {
      events: [
        {
          id: "digital_clone_viewed",
          name: "digital_clone_viewed",
          type: "events",
          properties: [
            {
              key: "clone_id",
              value: appUniqueId,
              operator: "exact",
              type: "event",
            },
          ],
        },
      ],
      display: "ActionsLineGraph",
      insight: "TRENDS",
      interval: "day",
      date_from: startDate.toISOString().split("T")[0],
      date_to: endDate.toISOString().split("T")[0],
    };

    const response = await firstValueFrom(
      this.httpService.post<PostHogTrendResult>(url, body, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }),
    );

    const result = response.data?.result?.[0];
    if (!result) return [];

    return result.days.map((date, index) => ({
      date,
      count: result.data[index] || 0,
    }));
  }

  private async getUniqueVisitors(
    appUniqueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; count: number }>> {
    const url = `${this.baseUrl}/api/projects/${this.projectId}/insights/trend/`;

    const body = {
      events: [
        {
          id: "digital_clone_viewed",
          name: "digital_clone_viewed",
          type: "events",
          math: "dau", // Daily Active Users
          properties: [
            {
              key: "clone_id",
              value: appUniqueId,
              operator: "exact",
              type: "event",
            },
          ],
        },
      ],
      display: "ActionsLineGraph",
      insight: "TRENDS",
      interval: "day",
      date_from: startDate.toISOString().split("T")[0],
      date_to: endDate.toISOString().split("T")[0],
    };

    const response = await firstValueFrom(
      this.httpService.post<PostHogTrendResult>(url, body, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }),
    );

    const result = response.data?.result?.[0];
    if (!result) return [];

    return result.days.map((date, index) => ({
      date,
      count: result.data[index] || 0,
    }));
  }

  private async getCountryDistribution(
    appUniqueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ country: string; count: number }>> {
    const url = `${this.baseUrl}/api/projects/${this.projectId}/insights/trend/`;

    const body = {
      events: [
        {
          id: "digital_clone_viewed",
          name: "digital_clone_viewed",
          type: "events",
          math: "dau", // Use Daily Active Users for unique visitors
          properties: [
            {
              key: "clone_id",
              value: appUniqueId,
              operator: "exact",
              type: "event",
            },
          ],
        },
      ],
      breakdown: "$geoip_country_code",
      breakdown_type: "event", // GeoIP data is typically stored on events
      display: "ActionsTable",
      insight: "TRENDS",
      date_from: startDate.toISOString().split("T")[0],
      date_to: endDate.toISOString().split("T")[0],
    };

    try {
      this.logger.debug(`Fetching country distribution for app: ${appUniqueId}`);
      this.logger.debug(
        `Date range: ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
      );
      this.logger.debug(`PostHog request body: ${JSON.stringify(body, null, 2)}`);

      const response = await firstValueFrom(
        this.httpService.post<PostHogTrendResult>(url, body, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }),
      );

      this.logger.debug(`PostHog response: ${JSON.stringify(response.data, null, 2)}`);

      // Additional debugging for country data
      if (response.data?.result) {
        this.logger.debug(`Total result items: ${response.data.result.length}`);
        response.data.result.forEach((item, index) => {
          this.logger.debug(
            `Result item ${index}: label="${item.label}", count=${item.count}, data=[${item.data
              ?.slice(0, 3)
              .join(", ")}...]`,
          );
        });
      }

      // Process results and aggregate properly
      const countryMap = new Map<string, number>();

      if (!response.data?.result) {
        this.logger.warn("No result data in PostHog response");
        return [];
      }

      response.data.result.forEach((item, index) => {
        this.logger.debug(`Processing result item ${index}: ${JSON.stringify(item)}`);
        const countryCode = item.label || "Unknown";
        // Check for aggregated_value when count is 0
        const count = item.count || item.aggregated_value || 0;

        if (
          countryCode !== "Unknown" &&
          countryCode !== "null" &&
          countryCode !== "" &&
          !countryCode.includes("$_posthog_breakdown_null_$") &&
          count > 0
        ) {
          // Use country code directly - frontend will handle conversion
          countryMap.set(countryCode, (countryMap.get(countryCode) || 0) + count);
          this.logger.debug(`Added country ${countryCode} with count ${count}`);
        } else {
          this.logger.debug(
            `Filtered out country: ${countryCode} with count: ${count}, aggregated_value: ${item.aggregated_value}`,
          );
        }
      });

      const result = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      this.logger.debug(`Final country distribution result: ${JSON.stringify(result, null, 2)}`);
      return result;
    } catch (error) {
      this.logger.error(`Error fetching country distribution: ${error.message}`);
      this.logger.error(`Error details: ${JSON.stringify(error.response?.data || error, null, 2)}`);

      // Try fallback with different approaches
      return this.getCountryDistributionFallback(appUniqueId, startDate, endDate);
    }
  }

  private async getCountryDistributionFallback(
    appUniqueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ country: string; count: number }>> {
    this.logger.debug("Trying fallback country distribution without math parameter");

    const url = `${this.baseUrl}/api/projects/${this.projectId}/insights/trend/`;

    const body = {
      events: [
        {
          id: "digital_clone_viewed",
          name: "digital_clone_viewed",
          type: "events",
          // Remove math parameter to get total events first
          properties: [
            {
              key: "clone_id",
              value: appUniqueId,
              operator: "exact",
              type: "event",
            },
          ],
        },
      ],
      breakdown: "$geoip_country_code",
      breakdown_type: "event", // GeoIP data is typically stored on events
      display: "ActionsTable",
      insight: "TRENDS",
      date_from: startDate.toISOString().split("T")[0],
      date_to: endDate.toISOString().split("T")[0],
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<PostHogTrendResult>(url, body, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }),
      );

      this.logger.debug(`Fallback PostHog response: ${JSON.stringify(response.data, null, 2)}`);

      const countryMap = new Map<string, number>();

      response.data?.result?.forEach((item) => {
        const countryCode = item.label || "Unknown";
        const count = item.count || item.aggregated_value || 0;

        if (
          countryCode !== "Unknown" &&
          countryCode !== "null" &&
          countryCode !== "" &&
          !countryCode.includes("$_posthog_breakdown_null_$") &&
          count > 0
        ) {
          countryMap.set(countryCode, (countryMap.get(countryCode) || 0) + count);
        }
      });

      return Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      this.logger.error(`Fallback country distribution also failed: ${error.message}`);

      // Try one more time with alternative geo properties
      return this.getCountryDistributionAlternative(appUniqueId, startDate, endDate);
    }
  }

  private async getCountryDistributionAlternative(
    appUniqueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ country: string; count: number }>> {
    this.logger.debug("Trying alternative country distribution with different geo properties");

    // Try different combinations of properties and breakdown types
    const attempts = [
      { property: "$geoip_country_code", type: "event" },
      { property: "$geoip_country", type: "event" },
      { property: "geoip_country_code", type: "event" },
      { property: "$geoip_country_code", type: "person" },
      { property: "$initial_geoip_country_code", type: "person" },
    ];

    for (const { property: prop, type } of attempts) {
      try {
        this.logger.debug(`Trying with property: ${prop} and breakdown_type: ${type}`);
        const url = `${this.baseUrl}/api/projects/${this.projectId}/insights/trend/`;

        const body = {
          events: [
            {
              id: "digital_clone_viewed",
              name: "digital_clone_viewed",
              type: "events",
              properties: [
                {
                  key: "clone_id",
                  value: appUniqueId,
                  operator: "exact",
                  type: "event",
                },
              ],
            },
          ],
          breakdown: prop,
          breakdown_type: type,
          display: "ActionsTable",
          insight: "TRENDS",
          date_from: startDate.toISOString().split("T")[0],
          date_to: endDate.toISOString().split("T")[0],
        };

        const response = await firstValueFrom(
          this.httpService.post<PostHogTrendResult>(url, body, {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
          }),
        );

        if (response.data?.result && response.data.result.length > 0) {
          this.logger.debug(`Success with property ${prop}: ${JSON.stringify(response.data.result, null, 2)}`);

          const countryMap = new Map<string, number>();
          let hasValidCountries = false;

          response.data.result.forEach((item) => {
            const countryCode = item.label || "Unknown";
            // Use aggregated_value if count is 0 but aggregated_value exists
            const count = item.count || item.aggregated_value || 0;

            if (
              countryCode !== "Unknown" &&
              countryCode !== "null" &&
              countryCode !== "" &&
              !countryCode.includes("$_posthog_breakdown_null_$") &&
              count > 0
            ) {
              countryMap.set(countryCode, (countryMap.get(countryCode) || 0) + count);
              hasValidCountries = true;
            }
          });

          if (hasValidCountries) {
            const result = Array.from(countryMap.entries())
              .map(([country, count]) => ({ country, count }))
              .sort((a, b) => b.count - a.count);

            this.logger.debug(`Found valid countries with ${prop}: ${JSON.stringify(result)}`);
            return result;
          }
        }
      } catch (err) {
        this.logger.debug(`Failed with property ${prop}: ${err.message}`);
      }
    }

    this.logger.error("All country distribution attempts failed");
    return [];
  }

  private mergeDailyMetrics(
    views: Array<{ date: string; count: number }>,
    visitors: Array<{ date: string; count: number }>,
  ): Array<{ date: string; pageViews: number; uniqueVisitors: number }> {
    const metricsMap = new Map<string, { pageViews: number; uniqueVisitors: number }>();

    views.forEach(({ date, count }) => {
      metricsMap.set(date, { pageViews: count, uniqueVisitors: 0 });
    });

    visitors.forEach(({ date, count }) => {
      const existing = metricsMap.get(date) || { pageViews: 0, uniqueVisitors: 0 };
      metricsMap.set(date, { ...existing, uniqueVisitors: count });
    });

    return Array.from(metricsMap.entries())
      .map(([date, metrics]) => ({ date, ...metrics }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
