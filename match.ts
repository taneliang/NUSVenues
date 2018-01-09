import * as fs from "fs";
import * as _ from "lodash";
import * as bluebird from "bluebird";
import * as proj4 from "proj4";
import axios from "axios";
import venues from "./data/venues";

type PoiData = {
  address: string;
  score: number;
  location: {
    x: number;
    y: number;
    z: number;
  };
  attributes: {
    ResultID: number;
    Loc_name: string | null;
    Status: string;
    Score: number;
    Match_addr: string;
    Xmin: number;
    Xmax: number;
    Ymin: number;
    Ymax: number;
    Addr_type: string;
  };
};

type NetworkData = {
  layerId: number;
  layerName: string;
  displayFieldName: string;
  foundFieldName: string;
  value: string;
  attributes: {
    OBJECTID: number;
    SHAPE: string;
    NAME: string;
    CODE: string;
    CATEGORY: string;
    SHAPE_Leng: string;
    ORIG_FID: number;
    FLOOR: string;
  };
  geometryType: string;
  geometry: {
    x: number;
    y: number;
    z: number;
    spatialReference: {
      wkid: number;
      latestWkid: number;
    };
  };
};

type PoiLocatedVenue = {
  venue: string;
  poiData: PoiData;
};

type CompleteVenue = {
  venue: string;
  poiData: PoiData;
  networkData?: NetworkData;
};

type Venue = {
  corsRoomCode: string;
  details?: {
    nusRoomCode: string;
    roomName: string;
    floor: number | null;
    location: {
      epsg3414: {
        x: number;
        y: number;
        z: number;
      };
      wgs84: {
        x: number;
        y: number;
        z: number;
      };
    };
  };
};

// When true, ignores what's already been matched
// and matches all venues again. Else only matches
// venues that are still unmatched.
const SHOULD_REMATCH = false;
const MATCHED_FILEPATH = "./results/matchedVenues.json";
const UNMATCHED_FILEPATH = "./results/unmatchedVenues.json";
const FINAL_FILEPATH = "./results/finalVenues.json";

const POI_LOCATOR_BATCH_URL =
  "https://arcgis.ami-lab.org/arcgis/rest/services/FULL_NUS_NETWORK_051017/POI_LOCATOR_051017/GeocodeServer/geocodeAddresses";
const NETWORK_FIND_URL =
  "https://arcgis.ami-lab.org/arcgis/rest/services/FULL_NUS_NETWORK_051017/FULL_NUS_NETWORK_051017/MapServer/find";

// EPSG:3414 def to convert location coords to WGS84
// Obtained from https://epsg.io/3414
proj4.defs(
  "EPSG:3414",
  "+proj=tmerc +lat_0=1.366666666666667 +lon_0=103.8333333333333 +k=1 +x_0=28001.642 +y_0=38744.572 +ellps=WGS84 +units=m +no_defs"
);

async function poiLocate(
  venuesToMatch: string[]
): Promise<{ matchedVenues: PoiLocatedVenue[]; unmatchedVenues: string[] }> {
  const matchedVenues = [];
  const unmatchedVenues = [];

  // Get a bunch at a time. If we try to request for all 500+ venues at one go, we get error 414
  const chunkedVenues = _.chunk(venuesToMatch, 50);
  // const chunkedVenues = _.take(_.chunk(venuesToMatch, 5), 2);
  for (const venues of chunkedVenues) {
    const records = venues.map((venue, idx) => ({
      attributes: {
        OBJECTID: idx,
        SingleKey: venue
      }
    }));

    const res = await axios.get(POI_LOCATOR_BATCH_URL, {
      params: { f: "json", addresses: { records } }
    });

    // Insert our venue name into results
    const locations = res.data.locations.map(location => ({
      venue: venues[location.attributes.ResultID],
      poiData: location
    }));

    // Append results to result arrays
    const matched = _.filter(locations, l => l.poiData.score > 71);
    matchedVenues.push(...matched);
    unmatchedVenues.push(..._.without(locations, ...matched).map(v => v.venue));
  }

  return { matchedVenues, unmatchedVenues };
}

async function getRoomNames(
  venues: PoiLocatedVenue[]
): Promise<CompleteVenue[]> {
  // return Promise.all(
  // venues.map(venue => {
  return bluebird.map(
    venues,
    venue => {
      const roomCode = venue.poiData.address;
      return axios
        .get(NETWORK_FIND_URL, {
          params: {
            searchText: roomCode,
            layers: 8, // POI layer
            returnGeometry: true,
            returnZ: true, // Ask for Z coords
            f: "json"
          }
        })
        .then(res => ({
          ...venue,
          networkData: res.data.results[0] as NetworkData
        }))
        .catch(err => {
          console.log(`Kena error for ${roomCode} ${err.message}`);
          return venue;
        });
    },
    { concurrency: 10 }
  );
}

function cleanedData(
  matchedVenues: CompleteVenue[],
  unmatchedVenues: string[]
): Venue[] {
  const proj = proj4("EPSG:3414", "EPSG:4326");
  // Convenience function to calculate WGS84 coords from EPSG:3414 coords
  const wgs84Coords = (location: { x: number; y: number; z: number }) =>
    proj.forward(location);

  return [
    ...matchedVenues.map(v => ({
      corsRoomCode: v.venue,
      details: {
        nusRoomCode: v.poiData.address,
        roomName: v.networkData.attributes.NAME,
        floor: parseInt(v.networkData.attributes.FLOOR) || null,
        location: {
          epsg3414: {
            x: v.poiData.location.x,
            y: v.poiData.location.y,
            z: v.poiData.location.z
          },
          wgs84: wgs84Coords(v.poiData.location)
        }
      }
    })),
    ...unmatchedVenues.map(v => ({ corsRoomCode: v }))
  ];
}

async function work() {
  const venuesToMatch = SHOULD_REMATCH
    ? venues
    : JSON.parse(fs.readFileSync(UNMATCHED_FILEPATH, "utf-8"));
  const existingMatchedVenues = SHOULD_REMATCH
    ? []
    : JSON.parse(fs.readFileSync(MATCHED_FILEPATH, "utf-8"));

  console.log(`Trying to match ${venuesToMatch.length} venues...`);

  const {
    matchedVenues: newlyMatchedVenues,
    unmatchedVenues
  } = await poiLocate(venuesToMatch);

  const completedVenues = await getRoomNames(newlyMatchedVenues);

  const matchedVenues = [...existingMatchedVenues, ...completedVenues];

  console.log(`Found ${matchedVenues.length} of ${venues.length} venues`);

  fs.writeFile(
    MATCHED_FILEPATH,
    JSON.stringify(matchedVenues, null, "\t"),
    err => err && console.log(err)
  );
  fs.writeFile(
    UNMATCHED_FILEPATH,
    JSON.stringify(unmatchedVenues, null, "\t"),
    err => err && console.log(err)
  );
  fs.writeFile(
    FINAL_FILEPATH,
    JSON.stringify(cleanedData(matchedVenues, unmatchedVenues), null, "\t"),
    err => err && console.log(err)
  );
}

work();
