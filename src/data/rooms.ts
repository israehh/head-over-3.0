import { RoomDefinition } from '../types/game';
import { buildRoomsFromJson } from '../engine/roomNetwork';

// Authoritative 20-room station network built dynamically from roomsNetwork.json
export const ALL_ROOMS: { [roomId: string]: RoomDefinition } = buildRoomsFromJson();

export const SECTOR_01 = ALL_ROOMS['sector_01'];
export const SECTOR_02 = ALL_ROOMS['sector_02'];
export const SECTOR_03 = ALL_ROOMS['sector_03'];
export const SECTOR_04 = ALL_ROOMS['sector_04'];
export const SECTOR_05 = ALL_ROOMS['sector_05'];
export const SECTOR_06 = ALL_ROOMS['sector_06'];
export const SECTOR_07 = ALL_ROOMS['sector_07'];
export const SECTOR_08 = ALL_ROOMS['sector_08'];
export const SECTOR_09 = ALL_ROOMS['sector_09'];
export const SECTOR_10 = ALL_ROOMS['sector_10'];
export const SECTOR_11 = ALL_ROOMS['sector_11'];
export const SECTOR_12 = ALL_ROOMS['sector_12'];
export const SECTOR_13 = ALL_ROOMS['sector_13'];
export const SECTOR_14 = ALL_ROOMS['sector_14'];
export const SECTOR_15 = ALL_ROOMS['sector_15'];
export const SECTOR_16 = ALL_ROOMS['sector_16'];
export const SECTOR_17 = ALL_ROOMS['sector_17'];
export const SECTOR_18 = ALL_ROOMS['sector_18'];
export const SECTOR_19 = ALL_ROOMS['sector_19'];
export const SECTOR_20 = ALL_ROOMS['sector_20'];

