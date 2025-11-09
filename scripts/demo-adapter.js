const fs = require("fs");
const MinnesotaAdapter = require("../js/adapter");

async function demo() {
  const adapter = new MinnesotaAdapter();

  // Mock fetchDistrict to avoid network
  adapter.fetchDistrict = async (source) => ({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          PrecinctID: `000${source.cd}`,
          Precinct: `Sample Precinct CD${source.cd}`,
          County: "Sample County",
          CongDist: source.cd
        },
        geometry: {
          type: "Polygon",
          coordinates: [[[ -93.1, 45.0 ], [ -93.0, 45.0 ], [ -93.0, 45.1 ], [ -93.1, 45.1 ], [ -93.1, 45.0 ]]]
        }
      }
    ]
  });

  const result = await adapter.fetchPrecincts();
  fs.writeFileSync("demo-mn-precincts.json", JSON.stringify(result, null, 2));
  console.log("Wrote demo-mn-precincts.json ✅");
}

demo().catch(console.error);
