import * as fs from "fs";
import llrooms from "./data/llrooms";
import venues from "./data/venues";

interface Room {
  roomcode: string;
  roomname: string;
  dept: string;
}

const rooms = llrooms as Room[];

// Tries a simple name match
function nameMatcher(venueName: string, room: Room) {
  return venueName === room.roomcode;
}

// Tries matching LT venues, e.g. LT14, with rooms with name LECTURE THEATRE 14
function ltMatcher(venueName: string, room: Room) {
  if (venueName.indexOf("LT") !== 0) return false;
  const ltNumber = venueName.substring(2);
  return room.roomname === `LECTURE THEATRE ${ltNumber}`;
}

// Tries to transform roomcodes like AS1-02-03 to venue names like AS1-0203
function numberSplitMatcher(venueName: string, room: Room) {
  const splitRoomCode = room.roomcode.split("-");
  if (splitRoomCode.length !== 3) return false;
  const adaptedVenueName = `${splitRoomCode[0]}-${splitRoomCode[1]}${
    splitRoomCode[2]
  }`;
  return venueName === adaptedVenueName;
}

const matchers = [nameMatcher, ltMatcher, numberSplitMatcher];

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
