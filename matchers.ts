import { Room } from "./match";

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

export default [nameMatcher, ltMatcher, numberSplitMatcher];
