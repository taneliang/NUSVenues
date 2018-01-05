import { Room } from "./match";

// type Matcher = (venueName: string, room: Room) => boolean;

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

function sdeMatcher(venueName: string, room: Room) {
  if (venueName.indexOf("SDE") !== 0 || room.roomcode.indexOf("SDE") !== 0)
    return false;

  // Learning rooms
  const lrMatches = venueName.match(/SDE-(\d{3})/);
  if (lrMatches) {
    if (room.roomcode === `SDE3-04-${lrMatches[1]}`) return true;
  }

  // Seminar rooms
  const srMatches = venueName.match(/SDE-SR(\d+)/);
  if (srMatches) {
    if (room.roomname === `SEMINAR ROOM ${srMatches[1]}`) return true;
  }

  // E-studios
  const esMatches = venueName.match(/SDE-ES(\d+)/);
  if (esMatches) {
    if (room.roomname === `E-STUDIO ${esMatches[1]}`) return true;
  }

  return false;
}

export default [nameMatcher, ltMatcher, numberSplitMatcher, sdeMatcher];
