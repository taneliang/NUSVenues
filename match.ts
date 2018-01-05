import * as fs from "fs";
import matchers from "./matchers";
import llrooms from "./data/llrooms";
import venues from "./data/venues";

export interface Room {
  roomcode: string;
  roomname: string;
  dept: string;
}

const rooms = llrooms as Room[];

// Search rooms to find match for this venue
function findVenue(venueName) {
  for (const matcher of matchers) {
    for (const room of rooms) {
      if (matcher(venueName, room)) {
        return room;
      }
    }
  }
}

// Match venues with rooms
function match() {
  const matchedVenues = [];
  const unmatchedVenues = [];
  for (const venue of venues) {
    const room = findVenue(venue);
    if (room) {
      matchedVenues.push({ ...room, venue });
    } else {
      unmatchedVenues.push(venue);
    }
  }
  return { matchedVenues, unmatchedVenues };
}

const { matchedVenues, unmatchedVenues } = match();
console.log(matchedVenues, unmatchedVenues);

console.log(
  `Found ${Object.keys(matchedVenues).length} of ${
    venues.length
  } venues among ${rooms.length} rooms.`
);

fs.writeFile(
  "./results/matchedVenues.json",
  JSON.stringify(matchedVenues, null, "\t"),
  err => err && console.log(err)
);
fs.writeFile(
  "./results/unmatchedVenues.json",
  JSON.stringify(unmatchedVenues, null, "\t"),
  err => err && console.log(err)
);
