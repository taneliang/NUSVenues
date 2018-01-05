import * as fs from "fs";
import matchers from "./matchers";
import llrooms from "./data/llrooms";
import venues from "./data/venues";

// When true, ignores what's already been matched
// and matches all venues again. Else only matches
// venues that are still unmatched.
const SHOULD_REMATCH = false;
const MATCHED_FILEPATH = "./results/matchedVenues.json";
const UNMATCHED_FILEPATH = "./results/unmatchedVenues.json";

export interface Room {
  roomcode: string;
  roomname: string;
  dept: string;
}

const rooms = llrooms as Room[];

// Search rooms to find match for this venue
function findVenue(venueName: string) {
  for (const matcher of matchers) {
    for (const room of rooms) {
      if (matcher(venueName, room)) {
        return room;
      }
    }
  }
}

// Match venues with rooms
function match(venuesToMatch: string[]) {
  const matchedVenues = [];
  const unmatchedVenues = [];

  for (const venue of venuesToMatch) {
    const room = findVenue(venue);
    if (room) {
      matchedVenues.push({ ...room, venue });
    } else {
      unmatchedVenues.push(venue);
    }
  }
  return { matchedVenues, unmatchedVenues };
}

const venuesToMatch = SHOULD_REMATCH
  ? venues
  : JSON.parse(fs.readFileSync(UNMATCHED_FILEPATH, "utf-8"));
const existingMatchedVenues = SHOULD_REMATCH
  ? []
  : JSON.parse(fs.readFileSync(MATCHED_FILEPATH, "utf-8"));

console.log(`Trying to match ${venuesToMatch.length} venues...`);

const { matchedVenues: newlyMatchedVenues, unmatchedVenues } = match(
  venuesToMatch
);
const matchedVenues = [...existingMatchedVenues, ...newlyMatchedVenues];

console.log(
  `Found ${matchedVenues.length} of ${venues.length} venues among ${
    rooms.length
  } rooms.`
);

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
