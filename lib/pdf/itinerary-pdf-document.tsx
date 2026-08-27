import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Itinerary, TripRequest } from "@/lib/trip-schema";
import { formatCurrency } from "@/lib/formatters";
import { getDailyCarryChecklist, getTripWeatherSummary } from "@/lib/weather";

// Define PDF styles
const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    color: "#1e293b",
    fontSize: 10,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#187764",
    borderBottomStyle: "solid",
    paddingBottom: 10,
    marginBottom: 16,
  },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#16324f",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 9,
    color: "#187764",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },
  headerRight: {
    textAlign: "right",
  },
  docTitle: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "Helvetica",
  },
  heroBanner: {
    backgroundColor: "#f7f5f1",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e8e3db",
    borderStyle: "solid",
  },
  destinationTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#16324f",
    marginBottom: 4,
  },
  subDetails: {
    fontSize: 10,
    color: "#475569",
    marginBottom: 12,
  },
  costBox: {
    backgroundColor: "#16324f",
    borderRadius: 6,
    padding: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  costLabel: {
    color: "#cbd5e1",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  costValue: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  weatherPdfBox: {
    backgroundColor: "#e7f2ef",
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#cae2dc",
    borderStyle: "solid",
  },
  weatherPdfTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#187764",
    marginBottom: 3,
  },
  weatherPdfText: {
    fontSize: 9,
    color: "#334155",
    lineHeight: 1.4,
  },
  weatherPdfDisclosure: {
    fontSize: 7.5,
    color: "#64748b",
    marginTop: 4,
    fontFamily: "Helvetica-Oblique",
  },
  summaryText: {
    fontSize: 10,
    color: "#334155",
    lineHeight: 1.5,
    marginTop: 10,
  },
  sectionHeading: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#16324f",
    marginBottom: 12,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayCard: {
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  dayHeader: {
    backgroundColor: "#e7f2ef",
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "solid",
  },
  dayTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dayNumberBadge: {
    color: "#187764",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  dayTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#16324f",
  },
  dayCost: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#187764",
  },
  weatherSubtext: {
    fontSize: 8.5,
    color: "#0d9488",
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
    marginBottom: 6,
    paddingHorizontal: 14,
  },
  dayContent: {
    padding: 12,
  },
  carryBox: {
    backgroundColor: "#fffdf0",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#fef08a",
    borderStyle: "solid",
  },
  carryCategoryLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#b45309",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  carryText: {
    fontSize: 8.5,
    color: "#451a03",
    lineHeight: 1.3,
  },
  nearbyPdfBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderStyle: "solid",
  },
  nearbyPdfCategoryLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#166534",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  nearbyPdfText: {
    fontSize: 8.5,
    color: "#14532d",
    lineHeight: 1.3,
  },
  categoryLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  activityItem: {
    borderLeftWidth: 2,
    borderLeftColor: "#b6dfd5",
    borderLeftStyle: "solid",
    paddingLeft: 10,
    marginBottom: 10,
  },
  activityHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 2,
  },
  activityName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#16324f",
    flex: 1,
  },
  activityCost: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#187764",
  },
  activityMeta: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    marginBottom: 3,
  },
  activityDesc: {
    fontSize: 9,
    color: "#475569",
    lineHeight: 1.4,
  },
  restaurantBox: {
    backgroundColor: "#fff8e9",
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
    borderStyle: "solid",
  },
  restaurantCategoryLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#b45309",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  restaurantItem: {
    marginBottom: 6,
  },
  restaurantName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#16324f",
  },
  restaurantMeta: {
    fontSize: 8.5,
    color: "#78350f",
  },
  tipsSection: {
    backgroundColor: "#e7f2ef",
    borderRadius: 8,
    padding: 14,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#cae2dc",
    borderStyle: "solid",
  },
  tipsTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#16324f",
    marginBottom: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  tipBullet: {
    width: 12,
    fontSize: 10,
    color: "#187764",
    fontFamily: "Helvetica-Bold",
  },
  tipText: {
    flex: 1,
    fontSize: 9,
    color: "#334155",
    lineHeight: 1.4,
  },
  disclaimer: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    borderTopStyle: "solid",
    paddingTop: 6,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingTop: 8,
  },
  footerBrand: {
    fontSize: 8,
    color: "#94a3b8",
    fontFamily: "Helvetica-Bold",
  },
  footerPage: {
    fontSize: 8,
    color: "#94a3b8",
  },
});

type ItineraryPdfDocumentProps = {
  itinerary: Itinerary;
  request: TripRequest;
};

export function ItineraryPdfDocument({ itinerary, request }: ItineraryPdfDocumentProps) {
  const currency = itinerary.currency || request.currency || "INR";
  const weatherSummary = getTripWeatherSummary(itinerary.dailyItinerary);

  return (
    <Document title={`Roamly Itinerary - ${itinerary.destination}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Roamly</Text>
            <Text style={styles.brandSubtitle}>Considered Travel Itineraries</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Custom Travel Plan</Text>
            <Text style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>
              Generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </Text>
          </View>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.destinationTitle}>{itinerary.destination}</Text>
          <Text style={styles.subDetails}>
            {itinerary.country} · {request.duration} Days · {request.travelers} {request.travelers === 1 ? "Traveler" : "Travelers"} · Style: {request.style}
          </Text>

          <View style={styles.costBox}>
            <Text style={styles.costLabel}>Estimated Total Cost</Text>
            <Text style={styles.costValue}>{formatCurrency(itinerary.estimatedTotalCost, currency)}</Text>
          </View>

          {/* Trip Weather Outlook PDF Box */}
          {weatherSummary.mode !== "unavailable" && (
            <View style={styles.weatherPdfBox}>
              <Text style={styles.weatherPdfTitle}>{weatherSummary.title} ({weatherSummary.conditionSummary})</Text>
              <Text style={styles.weatherPdfText}>
                Temperatures: {weatherSummary.tempMin}°C – {weatherSummary.tempMax}°C · {weatherSummary.rainLikelihoodText}
              </Text>
              <Text style={styles.weatherPdfText}>
                Recommendation: {weatherSummary.recommendation}
              </Text>
              <Text style={styles.weatherPdfDisclosure}>{weatherSummary.disclosure}</Text>
            </View>
          )}

          {itinerary.summary && (
            <Text style={styles.summaryText}>{itinerary.summary}</Text>
          )}
        </View>

        {/* Day-by-Day Itinerary */}
        <Text style={styles.sectionHeading}>Day-by-Day Itinerary</Text>

        {itinerary.dailyItinerary.map((day) => {
          const checklist = getDailyCarryChecklist(day, day.weather);

          return (
            <View key={day.day} style={styles.dayCard} wrap={false}>
              {/* Day Header */}
              <View style={styles.dayHeader}>
                <View style={styles.dayTitleLeft}>
                  <Text style={styles.dayNumberBadge}>DAY {day.day}:</Text>
                  <Text style={styles.dayTitle}>{day.title}</Text>
                </View>
                <Text style={styles.dayCost}>{formatCurrency(day.dailyEstimatedCost, currency)}</Text>
              </View>

              {/* Weather Subtext */}
              {day.weather && (
                <Text style={styles.weatherSubtext}>
                  Weather: {day.weather.condition} ({day.weather.temperatureMin ?? 'N/A'}°C to {day.weather.temperatureMax ?? 'N/A'}°C
                  {day.weather.precipitationProbability != null && day.weather.precipitationProbability > 0
                    ? ` · ${day.weather.precipitationProbability}% rain`
                    : ""}) · {day.weather.mode === "forecast" ? "Forecast" : "Typical Conditions"}
                </Text>
              )}

              <View style={styles.dayContent}>
                {/* Carry Checklist PDF Box */}
                {checklist && checklist.length > 0 && (
                  <View style={styles.carryBox}>
                    <Text style={styles.carryCategoryLabel}>WHAT TO CARRY TODAY</Text>
                    <Text style={styles.carryText}>
                      {checklist.map((item) => `• ${item.label}`).join("   ")}
                    </Text>
                  </View>
                )}

                {/* Nearby Places PDF Box */}
                {day.nearbyPlaces && day.nearbyPlaces.length > 0 && (
                  <View style={styles.nearbyPdfBox}>
                    <Text style={styles.nearbyPdfCategoryLabel}>NEARBY PLACES</Text>
                    <Text style={styles.nearbyPdfText}>
                      {day.nearbyPlaces.map((p) => `• ${p.name} (${p.distanceKm} km away)`).join("   ")}
                    </Text>
                  </View>
                )}

                {/* Activities */}
                {day.activities && day.activities.length > 0 && (
                  <View>
                    <Text style={styles.categoryLabel}>Explore Activities</Text>
                    {day.activities.map((activity, idx) => (
                      <View key={idx} style={styles.activityItem}>
                        <View style={styles.activityHeaderRow}>
                          <Text style={styles.activityName}>{activity.name}</Text>
                          <Text style={styles.activityCost}>{formatCurrency(activity.estimatedCost, currency)}</Text>
                        </View>
                        <Text style={styles.activityMeta}>
                          {activity.startTime} · {activity.duration} · {activity.location}
                        </Text>
                        <Text style={styles.activityDesc}>{activity.description}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Restaurants */}
                {day.restaurants && day.restaurants.length > 0 && (
                  <View style={styles.restaurantBox}>
                    <Text style={styles.restaurantCategoryLabel}>Dining & Local Flavors</Text>
                    {day.restaurants.map((restaurant, idx) => (
                      <View key={idx} style={styles.restaurantItem}>
                        <View style={styles.activityHeaderRow}>
                          <Text style={styles.restaurantName}>{restaurant.name}</Text>
                          <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#b45309" }}>
                            {formatCurrency(restaurant.estimatedCost, currency)}
                          </Text>
                        </View>
                        <Text style={styles.restaurantMeta}>
                          {restaurant.meal} · {restaurant.cuisine} · {restaurant.location}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Travel Tips Section */}
        {itinerary.travelTips && itinerary.travelTips.length > 0 && (
          <View style={styles.tipsSection} wrap={false}>
            <Text style={styles.tipsTitle}>Useful Travel Tips</Text>
            {itinerary.travelTips.map((tip, idx) => (
              <View key={idx} style={styles.tipItem}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
            <Text style={styles.disclaimer}>
              All prices are conservative estimates for planning. Availability, opening hours, and reservations are not guaranteed.
            </Text>
          </View>
        )}

        {/* Footer (Fixed on every page) */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>Roamly — AI Travel Planner</Text>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
