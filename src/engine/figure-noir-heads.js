// Phase 34b: the noir figure's heads, placed by hand at the final 24x32 size so faces keep their features.
//
// Two grids, both measured from the head:
//   - FACE templates are 12 wide at frame column 6, row 1: the head is columns 2-9 and rows 2-9 of the template
//     (frame rows 3-10). Features are drawn on top at fixed spots: brows row 5, eyes row 6, nose row 7, mouth row 8.
//   - HAIR and HAT templates are 14 wide at frame column 5, row 0: the head is columns 3-10 and rows 3-10.
// Hair and hat letters: H h d D = light, base, dark, deep. In hair, s = a streak, k = a shaved scalp,
// x = a hair tie (the accessory colour). In hats, g/G = goggle lenses, o = a steel filter, v = a veil's mesh.
// A hat's `cut` is the first hair row that shows below it.

import { mix } from './figure-hd.js';
import { PARTS, shade } from './figure.js';

const INK = '#0b0a10', EYE = '#221418', EYE_W = '#e0d8cc', WHITE = '#efe8d8', LIP = '#8e4a44', LIP_R = '#b04a5a',
  GOLD = '#e0a64a', SILVER = '#d4d6dc', LENS = '#9fc6d6', STREAK = '#d0682e', OMBRE = '#c9995e', BANDAGE = '#e4dccb',
  SCAR = '#e8d0c0', AV_FRAME = '#9aa0ac', AV = '#6a3ad0', AV_L = '#b08cf0', AV_D = '#3a1e7a', CIG = '#ece6da';

// ---------- the bare head ----------
const FACE = {
  down: ['............', '............', '...122223...', '..12222223..', '..12222223..', '..12222223..', '.2122222233.', '..1222n233..', '...222223...', '....2233....'],
  up: ['............', '............', '...122223...', '..12222223..', '..12222223..', '..12222233..', '.2122222333.', '..12222233..', '...222233...', '....2233....'],
  right: ['............', '............', '...122223...', '..12222223..', '..12222222..', '..12222222..', '..12332222..', '..123322222.', '..12222222..', '....22223...'],
};
const SKIN_T = { 1: 1, 2: 0, 3: -1, 4: -2, n: -1 };

// ---------- hair ----------
const rows = s => s.split('|');
const HAIR = {
  Crop: {
    down: rows('..............|..............|....Hhhhhd....|...Hhhhhhhd...|...hh....dd...|...h......d...'),
    up: rows('..............|..............|....Hhhhhd....|...Hhhhhhhd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhddd...|....ddddDD....'),
    right: rows('..............|..............|....Hhhhh.....|...Hhhhhhhd...|...hhhhhhd....|...hhhh.......|...hh.........|...dd.........|...d..........'),
  },
  'Side part': {
    down: rows('..............|.....Hhh......|...HHhhhhhd...|..HHhhhhhhdd..|..hhhhhh..dd..|..hh......dd..|..h........d..'),
    up: rows('..............|.....Hhh......|...HHhhhhhd...|..HHhhhhhhdd..|..hhhhhhhhdd..|..hhhhhhhhdd..|..hhhhhhhhdd..|...hhhhhhdd...|....ddddDD....'),
    right: rows('..............|.....Hhh......|...HHhhhhh....|..HHhhhhhhhd..|..hhhhhhhdd...|..hhhhh.......|..hhh.........|..hd..........|..dd..........'),
  },
  Long: {
    down: rows('..............|.....HHh......|...HHhhhhhd...|..HHhhhhhhdd..|..Hhh....hdd..|..hh......dD..|.hh........dD.|.hh........dD.|.hh........dD.|.hh........dD.|.hd........DD.|.hd........DD.|.dd........DD.|.dd........DD.|.d..........D.'),
    up: rows('..............|.....HHh......|...HHhhhhhd...|..HHhhhhhhdd..|..hhhhhhhhdd..|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhddD.|.dhhhhhhhhddD.|.ddhhhhhhhddD.|.dddhhhhhdddD.|..DDddddddDD..'),
    right: rows('..............|.....HHh......|...HHhhhhh....|..HHhhhhhhhd..|..hhhhhhhhd...|.hhhhhh.......|.hhhhh........|.hhhhd........|.hhhhd........|.hhhhd........|.hhhhd........|.hhhdd........|.hhhdd........|.dddd.........|..DD..........'),
  },
  Bun: {
    down: rows('......Hhd.....|.....Hhhd.....|....Hhhhhd....|...Hhhhhhhd...|...hh....dd...|...h......d...'),
    up: rows('.....HHhhd....|....Hhhhhhd...|....dhhhhdd...|...Hhhhhhhd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|....ddddDD....'),
    right: rows('..HHhd........|.Hhhhhd.......|.dhhHhhhh.....|...Hhhhhhhd...|...hhhhhhd....|...hhhh.......|...hh.........|...d..........'),
  },
  Curls: {
    down: rows('..............|...HhHhHh.....|..HhHhhhhhd...|.HhhhhhhhhhdD.|.hhhh....hhdD.|.hhh......hdD.|.hh........dD.|.dh........dD.|..d........D..'),
    up: rows('..............|...HhHhHh.....|..HhHhhhhhd...|.HhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|..dhdhdhdhDD..'),
    right: rows('..............|...HhHhHh.....|..HhHhhhhhd...|.HhhhhhhhhhhD.|.hhhhhhhhh....|.hhhhhh.......|.hhhhh........|.hhhhd........|..dhd.........'),
  },
  Mohawk: {
    down: rows('.....Hhd......|.....Hhd......|....kHhdk.....|...kkHhdkk....|...k......k...'),
    up: rows('.....Hhd......|.....Hhd......|....kHhdk.....|...kkHhdkk....|...kkhhdkk....|...kkhhdkk....|...kkhhdkk....|....kddkk.....'),
    right: rows('....HHhhd.....|...Hhhhhhd....|...dhhhhhd....|...kkkkkk.....|...kkk........|...kk.........'),
  },
  Bob: {
    down: rows('..............|....HHhhh.....|...HHhhhhhd...|..HHhhhhhhhd..|..Hhhhhh.hdD..|..hh......dD..|.hh........dD.|.hh........dD.|.hh........dD.|.dd........DD.'),
    up: rows('..............|....HHhhh.....|...HHhhhhhd...|..HHhhhhhhhd..|..hhhhhhhhdd..|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhddD.|.ddddddddDDDD.'),
    right: rows('..............|....HHhhh.....|...HHhhhhhd...|..HHhhhhhhhd..|..hhhhhhhhd...|.hhhhhhh......|.hhhhhh.......|.hhhhhd.......|.hhhhdd.......|.dddDD........'),
  },
  'Slick back': {
    down: rows('..............|..............|....HHHhh.....|...Hhhhhhhd...|...hh....dd...|...h......d...'),
    up: rows('..............|..............|....HHhhhd....|...Hhhhhhhd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|...dhhhhhdD...|....ddddDD....'),
    right: rows('..............|..............|....HHHhh.....|...HHhhhhhh...|..hhhhhhhd....|..hhhhh.......|..hhhh........|..dhd.........|..dd..........'),
  },
  Ponytail: {
    down: rows('..............|..............|....HHhhhd....|...Hhhhhhhd...|...hh....dd...|...h......d...|..........dd..|...........d..'),
    up: rows('..............|..............|....HHhhhd....|...Hhhhhhhd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|....dxxdD.....|.....hhd......|.....hhd......|.....hdd......|.....hd.......|.....dD.......|......D.......'),
    right: rows('..............|..............|....HHhhh.....|...Hhhhhhhh...|..hhhhhhhd....|.xhhhh........|hhdhh.........|hhd...........|hd............|hd............|hd............|d.............'),
  },
  Afro: {
    down: rows('...HHhhhhd....|..HHhhhhhhhd..|.HHhhhhhhhhhd.|.Hhhhhhhhhhhd.|Hhhhh....hhhdD|hhhh......hhdD|hhh........hdD|hh..........dD|dhh........dDD|.dd........DD.'),
    up: rows('...HHhhhhd....|..HHhhhhhhhd..|.HHhhhhhhhhhd.|Hhhhhhhhhhhhdd|hhhhhhhhhhhhdd|hhhhhhhhhhhhdd|hhhhhhhhhhhhdd|hhhhhhhhhhhhdd|dhhhhhhhhhhddD|.ddhhhhhhddDD.|..ddddddddD...'),
    right: rows('...HHhhhhd....|..HHhhhhhhhd..|.HHhhhhhhhhhd.|Hhhhhhhhhhhhd.|hhhhhhhhh.....|hhhhhhh.......|hhhhhh........|hhhhhd........|dhhhdd........|.ddD..........'),
  },
  Undercut: {
    down: rows('..............|....HHhhh.....|...HHhhhhhd...|...Hhhhhhhhd..|...k.hhh..k...|...k......k...'),
    up: rows('..............|....HHhhh.....|...HHhhhhhd...|...hhhhhhhd...|...kkkkkkkk...|...kkkkkkkk...|...kkkkkkkk...|...kkkkkkkk...|....kkkkkk....'),
    right: rows('..............|....HHhhh.....|...HHhhhhhhd..|...hhhhhhhhhd.|...kkkkk......|...kkk........|...kk.........'),
  },
  Braid: {
    down: rows('..............|..............|....HHhhhd....|...Hhhhhhhd...|..hhh....dd...|..hh......d...|.hh...........|.hd...........|.dh...........|.hd...........|.dh...........|.hd...........|.dh...........|.hd...........|.dh...........|.xx...........'),
    up: rows('..............|..............|....HHhhhd....|...Hhhhhhhd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|....dhhdD.....|.....hd.......|.....dh.......|.....hd.......|.....dh.......|.....hd.......|.....dh.......|.....xx.......'),
    right: rows('..............|..............|....HHhhh.....|...Hhhhhhhh...|..hhhhhhhd....|..hhhh........|.hdhh.........|.hd...........|.dh...........|.hd...........|.dh...........|.hd...........|.dh...........|.hd...........|.dh...........|.xx...........'),
  },
  Pixie: {
    down: rows('..............|..............|....HHhhd.....|...HHhhhhhd...|..HHhhhhh.dd..|..hhh.....d...|..h...........'),
    up: rows('..............|..............|....HHhhhd....|...Hhhhhhhd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhddd...|....ddddDD....'),
    right: rows('..............|..............|....HHhhh.....|...HHhhhhhhd..|...hhhhhhhhh..|...hhhh.......|...hd.........|...d..........'),
  },
  'Space buns': {
    down: rows('..Hhd....Hhd..|..hhd....hhd..|...dHhhhhdd...|...Hhhhhhhd...|...hh....dd...|...h......d...'),
    up: rows('..Hhd....Hhd..|..hhd....hhd..|...dHhhhhdd...|...Hhhhhhhd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhddd...|....ddddDD....'),
    right: rows('...Hhd..Hhd...|...hhd..hhd...|...dHhhhhhd...|...Hhhhhhhhd..|...hhhhhhd....|...hhhh.......|...hh.........'),
  },
  Pigtails: {
    down: rows('..............|.....HHhh.....|...HHhhhhhd...|..HHhhhhhhdd..|..Hhh....hdd..|..hh......dd..|.xh........dx.|hhd........hdD|hd..........dD|hd..........dD|hd..........dD|hd..........dD|d............D'),
    up: rows('..............|.....HHhh.....|...HHhhhhhd...|..HHhhhhhhdd..|..hhhhhhhhdd..|..hhhhhhhhdd..|.xhhhhhhhhhdx.|hhdhhhhhhhdhdD|hd..........dD|hd..........dD|hd..........dD|hd..........dD|d............D'),
    right: rows('..............|.....HHhh.....|...HHhhhhhd...|..HHhhhhhhhd..|..hhhhhhhhd...|..hhhhh.......|.xhhh.........|hhd...........|hd............|hd............|hd............|hd............|d.............'),
  },
  Dreadlocks: {
    down: rows('..............|....HhHhH.....|...HhHhhhhd...|..HhhHhhhhdd..|..hdh....hdD..|.hdh......dhD.|.dhd......hdD.|.hdh......dhD.|.dhd......hdD.|.hdh......dhD.|.dhd......hdD.|.hdh......dhD.|.dhd......hdD.|.d.d......d.D.'),
    up: rows('..............|....HhHhH.....|...HhHhhhhd...|..HhhHhhhhdd..|..hdhdhdhdhD..|.hdhdhdhdhdhD.|.dhdhdhdhdhdD.|.hdhdhdhdhdhD.|.dhdhdhdhdhdD.|.hdhdhdhdhdhD.|.dhdhdhdhdhdD.|.hdhdhdhdhdhD.|.dhdhdhdhdhdD.|.d.d.d.d.d.D..'),
    right: rows('..............|....HhHhH.....|...HhHhhhhd...|..HhhHhhhhhd..|..hdhdhdhd....|.hdhdh........|.dhdhd........|.hdhdh........|.dhdhd........|.hdhdh........|.dhdhd........|.hdhdh........|.dhdhd........|.d.d.d........'),
  },
  'Side shave': {
    down: rows('..............|.....HHhh.....|...kHhhhhhd...|...kHhhhhhdd..|...k...hhhddd.|...k......dDd.|...........dD.|...........dD.|...........dD.|...........DD.'),
    up: rows('..............|.....HHhh.....|...HHhhhhhk...|..hhhhhhhhk...|.hhhhhhhhhk...|.hhhhhhhhhk...|.hhhhhhhhhk...|.hhhhhhhhhk...|.dhhhhhhdk....|.DD...........'),
    right: rows('..............|.....HHhh.....|...HHhhhhhd...|...hhhhhhhhd..|...kkkkk......|...kkk........|...kk.........'),
  },
  'Bowl cut': {
    down: rows('..............|.....HHhh.....|...HHhhhhhd...|..HHhhhhhhhd..|..hhhhhhhhhd..|..dddddddddD..|..d........D..'),
    up: rows('..............|.....HHhh.....|...HHhhhhhd...|..HHhhhhhhhd..|..hhhhhhhhhd..|..hhhhhhhhhd..|..hhhhhhhhhd..|..dhhhhhhhdD..|...ddddddDD...'),
    right: rows('..............|.....HHhh.....|...HHhhhhhd...|..HHhhhhhhhd..|..hhhhhhhhhd..|..hhhhhhddd...|..hhh.........|..dd..........'),
  },
  Pompadour: {
    down: rows('....HHhhd.....|...HHhhhhhd...|...Hhhhhhhd...|...hhhhhhhd...|...hh....dd...|...h......d...'),
    up: rows('....HHhhd.....|...HHhhhhhd...|...hhhhhhhd...|...hhhhhhhd...|...hhhhhhhd...|...hhhhhhhd...|...hhhhhhhd...|....ddddDD....'),
    right: rows('.....HHhhh....|....HHhhhhhd..|...Hhhhhhhhhd.|...hhhhhhhhd..|...hhhhh......|...hhh........|...dd.........'),
  },
  Cornrows: {
    down: rows('..............|..............|....hdhdh.....|...hdhdhdh....|...h......h...'),
    up: rows('..............|..............|....hdhdh.....|...hdhdhdh....|...hdhdhdh....|...hdhdhdh....|...hdhdhdh....|...hdhdhdh....|....dDdDd.....'),
    right: rows('..............|..............|....hhhhh.....|...dddddddd...|...hhhhhh.....|...ddd........|...hh.........'),
  },
  Mullet: {
    down: rows('..............|..............|....Hhhhhd....|...Hhhhhhhd...|...hh....dd...|...h......d...|..h........d..|..h........d..|..h........d..|..d........D..|..d........D..|..d........D..'),
    up: rows('..............|..............|....Hhhhhd....|...Hhhhhhhd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdD...|...hhhhhhdD...|...hhhhhhdD...|...hhhhhhdD...|....ddddDD....'),
    right: rows('..............|..............|....Hhhhh.....|...Hhhhhhhd...|...hhhhhhd....|...hhhh.......|...hh.........|..hhh.........|..hhh.........|..hhh.........|..hhh.........|..hhd.........|..dd..........'),
  },
};
// Variations on the shapes above.
HAIR['Streaked long'] = HAIR.Long;
HAIR.Waves = HAIR.Long;
HAIR.Shaggy = {
  down: [...HAIR.Bob.down.slice(0, 4), '..HhHh.h.hdD..', ...HAIR.Bob.down.slice(5), '.d.d......D.D.'],
  up: [...HAIR.Bob.up, '.d.d.d.d.D.D..'],
  right: [...HAIR.Bob.right, '.d.d..........'],
};
HAIR['Top knot'] = {
  down: rows('......Hd......|.....xxx......|....Hhhhhd....|...Hhhhhhhd...|...hh....dd...|...h......d...'),
  up: rows('......Hd......|.....xxx......|....dhhhhd....|...Hhhhhhhd...|...hhhhhhdd...|...hhhhhhdd...|...hhhhhhdd...|....ddddDD....'),
  right: rows('......Hd......|.....xxx......|....HHhhh.....|...Hhhhhhhd...|...hhhhhhd....|...hhhh.......|...hh.........|...d..........'),
};
const BALDING = {
  down: rows('..............|..............|..............|..............|..............|..............|..hh......dd..|..h........d..|..h........d..'),
  up: rows('..............|..............|..............|..............|..............|...h......d...|...hhhhhhhdd..|...hhhhhhhdd..|...hhhhhhddd..|....ddddDD....'),
  right: rows('..............|..............|..............|..............|..............|...hh.........|...hhh........|...hhh........|...dd.........|...d..........'),
};

// ---------- hats ----------
const HAT = {
  Fedora: { cut: 5, brim: true,
    down: rows('....hhhhhh....|...Hhdddhhd...|...hhhhhhhd...|...DDDDDDDD...|.HHhhhhhhhhdd.'),
    right: rows('....hhhhhh....|...Hhhhhhhd...|...hhhhhhhd...|...DDDDDDDD...|.Hhhhhhhhhhhhd') },
  'Flat cap': { cut: 5,
    down: rows('..............|..............|...Hhhhhhhd...|...hhhhhhhd...|...DddddddD...'),
    up: rows('..............|..............|...Hhhhhhhd...|...hhhhhhhd...|...hhhhhhhd...'),
    right: rows('..............|..............|...Hhhhhhhh...|...hhhhhhhhd..|...hhhhhhhdddD') },
  Beanie: { cut: 5,
    down: rows('..............|....Hhhhhd....|...Hhhhhhhd...|...hhhhhhhd...|...DdDdDdDd...'),
    right: rows('..............|....Hhhhhd....|...Hhhhhhhd...|...hhhhhhhhd..|...DdDdDdDdD..') },
  Bowler: { cut: 5, brim: true,
    down: rows('.....hhhh.....|....Hhhhhd....|...Hhhhhhhd...|...DDDDDDDD...|..Hhhhhhhhhd..'),
    right: rows('.....hhhh.....|....Hhhhhd....|...Hhhhhhhd...|...DDDDDDDD...|..Hhhhhhhhhhd.') },
  'Wide brim': { cut: 5, brim: true,
    down: rows('..............|....hhhhhh....|...Hhhhhhhd...|...DDDDDDDD...|Hhhhhhhhhhhhhd|dd..........dd'),
    up: rows('..............|....hhhhhh....|...Hhhhhhhd...|...DDDDDDDD...|Hhhhhhhhhhhhhd'),
    right: rows('..............|....hhhhhh....|...Hhhhhhhd...|...DDDDDDDD...|Hhhhhhhhhhhhhd|d............d') },
  Trilby: { cut: 5, brim: true,
    down: rows('..............|....hhhhh.....|...Hhdddhd....|...DDDDDDDd...|..Hhhhhhhhhd..'),
    right: rows('..............|....hhhhh.....|...Hhhhhhd....|...DDDDDDDd...|...Hhhhhhhhhhd') },
  Beret: { cut: 4,
    down: rows('.....h........|..Hhhhhhh.....|.Hhhhhhhhhd...|..dDDDDDDDd...'),
    up: rows('........h.....|.....hhhhhhH..|...dhhhhhhhhH.|...dDDDDDDDd..'),
    right: rows('......h.......|...Hhhhhhh....|..Hhhhhhhhhhd.|...dDDDDDDd...') },
  'Hair bow': { cut: 0,
    down: rows('..............|.........H.H..|.........hDh..|.........d.d..'),
    up: rows('..............|..H.H.........|..hDh.........|..d.d.........'),
    right: rows('..............|...H.H........|...hDh........|...d.d........') },
  'Top hat': { cut: 5, brim: true,
    down: rows('....Hhhhhd....|....hhhhhd....|....hhhhhd....|....DDDDDD....|..Hhhhhhhhhd..'),
    right: rows('....Hhhhhd....|....hhhhhd....|....hhhhhd....|....DDDDDD....|..Hhhhhhhhhhd.') },
  'Garrison cap': { cut: 4,
    down: rows('..............|..............|....Hhhhhd....|...dddddddd...'),
    right: rows('..............|...Hhhhhhh....|...dhhhhhhhd..|..............') },
  'Sailor cap': { cut: 4,
    down: rows('..............|....Hhhhhd....|...Hhhhhhhd...|..HhhhhhhhhD..'),
    right: rows('..............|....Hhhhhd....|...Hhhhhhhd...|..HhhhhhhhhhD.') },
  Newsboy: { cut: 5,
    down: rows('......H.......|....HhHhhd....|...Hhhhhhhhd..|..hhhhhhhhhd..|...DddddddD...'),
    up: rows('......H.......|....HhHhhd....|...Hhhhhhhhd..|..hhhhhhhhhd..|...hhhhhhhd...'),
    right: rows('......H.......|....Hhhhhd....|...Hhhhhhhhd..|..hhhhhhhhhhd.|...hhhhhhhddD.') },
  Deerstalker: { cut: 7,
    down: rows('..............|....Hhhhhd....|...Hhhhhhhd...|...hhhhhhhd...|...DddddddD...|...h......d...|...h......d...'),
    right: rows('..............|....Hhhhhd....|...Hhhhhhhhd..|..dhhhhhhhhhd.|..dhhhhhhhhdd.|...hh.........|...hd.........') },
  'Cowboy hat': { cut: 5, brim: true,
    down: rows('....hdhhdh....|...Hhhhhhhd...|...hhhhhhhd...|H..DDDDDDDD..d|HHhhhhhhhhhhdd'),
    right: rows('....hhhhh.....|...Hhhhhhhd...|...hhhhhhhd...|H..DDDDDDDD..d|HHhhhhhhhhhhdd') },
  'Bucket hat': { cut: 6, brim: true,
    down: rows('..............|....Hhhhhd....|...Hhhhhhhd...|...hhhhhhhd...|..dhhhhhhhhd..|..D........D..'),
    up: rows('..............|....Hhhhhd....|...Hhhhhhhd...|...hhhhhhhd...|..dhhhhhhhhd..|..DDDDDDDDDD..'),
    right: rows('..............|....Hhhhhd....|...Hhhhhhhd...|...hhhhhhhd...|..dhhhhhhhhhd.|..D.........D.') },
  Headscarf: { cut: 99,
    down: rows('..............|....Hhhhhd....|...Hhhhhhhd...|..HhhhhhhhhD..|..hhDDDDDDhd..|..hh......hd..|..h........d..|..h........d..|..h........d..|...d......d...'),
    up: rows('..............|....Hhhhhd....|...Hhhhhhhd...|..HhhhhhhhhD..|..hhhhhhhhhd..|..hhhhhhhhhd..|..hhhhhhhhhd..|..hhhhhhhhhd..|..hhhhhhhhhd..|...hhddhhd....|....dDDd......|.....dd.......'),
    right: rows('..............|....Hhhhhd....|...Hhhhhhhhd..|..hhhhhhhhhd..|..hhhhhhhDd...|..hhhhh.......|..hhhhh.......|..hhhd........|.hhdd.........|dd............') },
  'Hood up': { cut: 99,
    down: rows('..............|....Hhhhhd....|...Hhhhhhhd...|..HhhhhhhhhD..|..hhd....dhD..|.hhd......dhD.|.hh........dD.|.hh........dD.|.hh........dD.|.hh........dD.|.hhd......dhD.|..hhhhhhhhhd..'),
    up: rows('..............|....Hhhhhd....|...Hhhhhhhd...|..HhhhhhhhhD..|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|.hhhhhhhhhhdD.|..hhhhhhhhhd..'),
    right: rows('..............|....Hhhhhd....|...Hhhhhhhhd..|..Hhhhhhhhhhd.|.hhhhhhhhd....|.hhhhhhd......|.hhhhhhd......|.hhhhhhd......|.hhhhhhd......|.hhhhhhd......|.hhhhhhhd.....|..hhhhhhh.....') },
  Veil: { cut: 4,
    down: rows('..............|.....Hhhd.....|...dHhhhhd....|...DDDDDDD....|..............|...v.v.v.v....|....v.v.v.v...|...v.v.v.v....'),
    up: rows('..............|.....Hhhd.....|....dHhhhhd...|....DDDDDDD...'),
    right: rows('..............|.....Hhhd.....|...dHhhhhd....|...DDDDDDD....|..............|........v.v...|.......v.v.v..|........v.v...') },
  Pillbox: { cut: 3,
    down: rows('..............|....Hhhhh.....|....hhhhhd....|....DDDDDD....'),
    right: rows('..............|.....Hhhhh....|.....hhhhhd...|.....DDDDDD...') },
  'Gas mask': { cut: 0,
    down: rows('..............|..............|..............|...d......d...|..............|...hhhhhhhh...|..hgGhhhgGhd..|..hhhhhhhhhd..|...hhDDDDhd...|....hDooDh....|.....DooD.....'),
    up: rows('..............|..............|..............|...d......d...|..............|..............|..DDDDDDDDDD..|..............|...DDDDDDDD...'),
    right: rows('..............|..............|..............|...d..........|..............|.......hhhh...|.....DhhgGh...|.....Dhhhhhd..|......hhDDDd..|.......hDooD..|........DooD..') },
  Bandana: { cut: 0,
    down: rows('..............|..............|..............|...DDDDDDDD...|...hhhhhhhhdd.|...........dh.|............d.'),
    up: rows('..............|..............|..............|...DDDDDDDD...|...hhhhhhhh...|.....dhhd.....|......dd......'),
    right: rows('..............|..............|..............|...DDDDDDDD...|..dhhhhhhhhh..|.dh...........|d.............') },
};
const TONE = { H: 1, h: 0, d: -1, D: -2 };

// ---------- the face ----------
// Positions on the 12-wide face grid (front view unless noted).
const EYES = {   // [outer, inner] colours by role; extra pixels after
  Round: { o: 'w', i: 'iris' }, Narrow: { o: 'lid', i: 'e' }, Hooded: { o: 'lid', i: 'iris', lid: true },
  Wide: { o: 'w', i: 'iris', under: true }, Lashes: { o: 'w', i: 'iris', lash: true }, Almond: { o: 'e', i: 'iris' },
  Downturned: { o: 'w', i: 'iris', droop: true },
};
const BROWS = {
  Straight: [[3, 5], [4, 5]], Arched: [[3, 5], [4, 4]], Heavy: [[3, 5], [4, 5], [3, 4], [4, 4]], Thin: [[3, 5], [4, 5]],
  Furrowed: [[3, 4], [4, 5]], Bushy: [[2, 5], [3, 5], [4, 5], [3, 4], [4, 4]], Unibrow: [[3, 5], [4, 5], [5, 5]], Shaved: [],
};
const MOUTHS = {
  Neutral: [[5, 8, 'lip'], [6, 8, 'lip']], Smirk: [[5, 8, 'lip'], [6, 8, 'lip'], [7, 7, 'lip']],
  Frown: [[5, 8, 'lip'], [6, 8, 'lip'], [4, 9, 'lip'], [7, 9, 'lip']], Full: [[5, 8, 'LIP'], [6, 8, 'LIPd'], [5, 9, 'LIPl'], [6, 9, 'LIPl']],
  Grin: [[4, 8, 'lip'], [5, 8, 'white'], [6, 8, 'white'], [7, 8, 'lip']], Smile: [[4, 7, 'lip'], [7, 7, 'lip'], [5, 8, 'lip'], [6, 8, 'lip']],
  'Soft smile': [[4, 7, 'soft'], [7, 7, 'soft'], [5, 8, 'rose'], [6, 8, 'rose']],
};
const MOUTHS_SIDE = {
  Neutral: [[8, 8, 'lip']], Smirk: [[8, 8, 'lip'], [8, 7, 'lip']], Frown: [[8, 8, 'lip'], [7, 9, 'lip']], Full: [[8, 8, 'LIP'], [8, 9, 'LIPl']],
  Grin: [[8, 8, 'white'], [7, 8, 'lip']], Smile: [[8, 8, 'lip'], [7, 7, 'lip']], 'Soft smile': [[8, 8, 'rose'], [7, 7, 'soft']],
};
const FACIAL = {
  Stubble: { tint: [[3, 8], [4, 8], [7, 8], [8, 8], [4, 9], [5, 9], [6, 9], [7, 9], [2, 7], [9, 7]] },
  Mustache: { hair: [[4, 8], [5, 8], [6, 8], [7, 8]], mouth: [[5, 9], [6, 9]] },
  Beard: { hair: [[2, 7], [9, 7], [3, 8], [4, 8], [7, 8], [8, 8], [4, 9], [5, 9], [6, 9], [7, 9], [5, 10], [6, 10]], dark: [[3, 9], [8, 9], [4, 10], [7, 10]] },
  Goatee: { hair: [[4, 8], [7, 8], [5, 9], [6, 9]], dark: [[5, 10], [6, 10]] },
  Sideburns: { hair: [[2, 5], [2, 6], [2, 7], [9, 5], [9, 6], [9, 7]] },
  Handlebar: { hair: [[4, 8], [5, 8], [6, 8], [7, 8], [3, 7], [8, 7]], mouth: [[5, 9], [6, 9]] },
  'Soul patch': { hair: [[6, 9]] },
  Chinstrap: { hair: [[2, 7], [9, 7], [3, 8], [8, 8], [4, 9], [7, 9], [5, 10], [6, 10]] },
};
const FACIAL_SIDE = {
  Stubble: { tint: [[5, 8], [6, 8], [7, 8], [9, 8], [5, 9], [6, 9], [7, 9], [8, 9]] },
  Mustache: { hair: [[9, 8], [8, 8]], mouth: [[8, 9]] },
  Beard: { hair: [[6, 7], [5, 8], [6, 8], [7, 8], [9, 8], [5, 9], [6, 9], [7, 9], [8, 9], [6, 10], [7, 10]], dark: [[8, 10]] },
  Goatee: { hair: [[8, 9], [7, 9]], dark: [[8, 10], [7, 10]] },
  Sideburns: { hair: [[6, 5], [6, 6], [6, 7]] },
  Handlebar: { hair: [[9, 8], [8, 8], [9, 7]], mouth: [[8, 9]] },
  'Soul patch': { hair: [[8, 9]] },
  Chinstrap: { hair: [[6, 7], [6, 8], [6, 9], [7, 9], [8, 10]] },
};
const MARKS = {
  'Brow scar': [[[4, 4], 'scar'], [[4, 5], 'scar']], 'Cheek scar': [[[8, 7], 'scar'], [[9, 8], 'scar']], Mole: [[[8, 8], 'mole']],
  Bandage: [[[8, 7], 'band'], [[9, 7], 'band'], [[8, 8], 'bandD'], [[9, 8], 'band']], 'Burn scar': [[[2, 7], 'burn'], [[3, 7], 'burn'], [[3, 8], 'burn']],
  Birthmark: [[[3, 8], 'birth'], [[4, 8], 'birth']], 'Stitched scar': [[[8, 6], 'scar'], [[8, 7], 'scar'], [[8, 8], 'scar'], [[7, 7], 'stitch'], [[9, 7], 'stitch']],
  'Eye scar': [[[8, 5], 'scar'], [[8, 6], 'scar'], [[8, 7], 'scar']],
};
const MARKS_SIDE = {
  'Brow scar': [[[8, 4], 'scar'], [[8, 5], 'scar']], 'Cheek scar': [[[7, 7], 'scar'], [[8, 8], 'scar']], Mole: [[[7, 8], 'mole']],
  Bandage: [[[6, 7], 'band'], [[7, 7], 'band'], [[6, 8], 'bandD'], [[7, 8], 'band']], 'Burn scar': [[[5, 7], 'burn'], [[6, 7], 'burn'], [[6, 8], 'burn']],
  Birthmark: [[[6, 8], 'birth'], [[7, 8], 'birth']], 'Stitched scar': [[[7, 6], 'scar'], [[7, 7], 'scar'], [[7, 8], 'scar'], [[6, 7], 'stitch'], [[8, 7], 'stitch']],
  'Eye scar': [[[8, 5], 'scar'], [[8, 6], 'scar'], [[8, 7], 'scar']],
};

// ---------- painting ----------

export function paintNoirHead(ctx, view) {
  const { L, U, look, C, pose, frame, has } = ctx;
  const hairName = PARTS.hair[look.hair], hatName = PARTS.hat[look.hat];
  const hat = hatName === 'None' ? null : HAT[hatName];
  const fx = 6, fy = U(1), hx = 5, hy = U(0);
  const F = (c, r, col) => L.O(fx + c, fy + r, col);
  const front = view === 'down', side = view === 'right';

  // the bare head
  FACE[view].forEach((row, r) => [...row].forEach((ch, c) => { if (ch in SKIN_T) L.P(fx + c, fy + r, 'skin', SKIN_T[ch]); }));

  // features
  const skinD = shade(C.skin, 0.72), skinDD = shade(C.skin, 0.55);
  const browCol = hairName === 'Bald' && !look.balding ? skinDD : shade(C.hair, 0.6);
  const lip = mix(skinDD, LIP, 0.45);
  const colour = k => ({ lip, LIP, LIPd: shade(LIP, 0.8), LIPl: shade(LIP, 1.15), white: WHITE, soft: mix(lip, LIP, 0.5), rose: mix(LIP, '#c46a6e', 0.4),
    scar: mix(C.skin, SCAR, 0.6), mole: shade(C.skin, 0.42), band: BANDAGE, bandD: shade(BANDAGE, 0.85), burn: mix(C.skin, '#b86a5a', 0.45),
    birth: mix(C.skin, '#8a3a4a', 0.35), stitch: shade(C.skin, 0.45) }[k]);
  const ko = pose === 'ko';
  const eyeName = PARTS.eyes[look.eyes], browName = PARTS.brows[look.brows], mouthName = PARTS.mouth[look.mouth];
  const iris = mix(C.eye, EYE, 0.3);
  if (front) {
    const E = EYES[eyeName] ?? EYES.Round;
    const role = r => (r === 'w' ? EYE_W : r === 'e' ? EYE : r === 'iris' ? iris : skinD);
    for (const [o, i] of [[3, 4], [8, 7]]) {
      if (ko) { F(o, 6, skinDD); F(i, 6, skinDD); continue; }
      F(o, 6, role(E.o)); F(i, 6, role(E.i));
      if (E.lid) { F(o, 5, skinD); F(i, 5, skinD); }
      if (E.under) F(i, 7, mix(C.skin, EYE_W, 0.5));
      if (E.droop) F(o, 7, skinD);
      if (E.lash) F(o + (o < 6 ? -1 : 1), 6, EYE);
    }
    for (const [x, y] of BROWS[browName] ?? BROWS.Straight) {
      const c = browName === 'Thin' ? mix(browCol, C.skin, 0.45) : browCol;
      F(x, y, c); F(11 - x, y, c);
    }
    for (const [x, y, k] of MOUTHS[mouthName] ?? MOUTHS.Neutral) F(x, y, colour(k));
    const face = PARTS.face[look.face];
    if (face === 'Freckles') for (const [x, y] of [[3, 7], [8, 7], [3, 8], [8, 8], [2, 7]]) F(x, y, c => c && shade(c, 0.8));
    if (face === 'Tired eyes') for (const x of [3, 4, 7, 8]) F(x, 7, c => c && mix(c, '#5a4a6a', 0.3));
    if (face === 'Rosy') for (const [x, y] of [[3, 7], [8, 7], [2, 7], [9, 7]]) F(x, y, c => c && mix(c, '#c46a5e', 0.5));
  } else if (side) {
    if (ko) F(8, 6, skinDD);
    else {
      const E = EYES[eyeName] ?? EYES.Round;
      F(8, 6, E.i === 'e' || E.o === 'e' ? EYE : iris);
      if (E.o === 'w' && E.under) F(7, 6, EYE_W);
      if (E.lid || E.o === 'lid') F(8, 5, skinD);
      if (E.lash) F(9, 5, EYE);
      if (E.droop) F(8, 7, skinD);
    }
    const bc = browName === 'Thin' ? mix(browCol, C.skin, 0.45) : browCol;
    if (browName !== 'Shaved') { F(8, browName === 'Arched' ? 4 : 5, bc); F(9, 5, bc); if (['Heavy', 'Bushy', 'Unibrow'].includes(browName)) F(7, 5, bc); }
    for (const [x, y, k] of MOUTHS_SIDE[mouthName] ?? MOUTHS_SIDE.Neutral) F(x, y, colour(k));
    const face = PARTS.face[look.face];
    if (face === 'Freckles') for (const [x, y] of [[6, 7], [7, 7], [7, 8]]) F(x, y, c => c && shade(c, 0.8));
    if (face === 'Tired eyes') F(7, 7, c => c && mix(c, '#5a4a6a', 0.3));
    if (face === 'Rosy') for (const [x, y] of [[7, 7], [7, 8]]) F(x, y, c => c && mix(c, '#c46a5e', 0.5));
  }
  if (front || side) {
    const mark = PARTS.mark[look.mark];
    for (const [[x, y], k] of ((side ? MARKS_SIDE : MARKS)[mark] ?? [])) F(x, y, colour(k));
    const fh = (side ? FACIAL_SIDE : FACIAL)[PARTS.facial[look.facial]];
    if (fh) {
      for (const [x, y] of fh.tint ?? []) F(x, y, c => c && mix(c, C.beard, 0.32));
      for (const [x, y] of fh.hair ?? []) { if (y === 10) L.P(fx + x, fy + y, 'skin', 0); F(x, y, (x + y) % 2 ? C.beard : C.beardD); }
      for (const [x, y] of fh.dark ?? []) { if (y === 10) L.P(fx + x, fy + y, 'skin', 0); F(x, y, C.beardD); }
      for (const [x, y] of fh.mouth ?? []) F(x, y, lip);
    }
    if (look.smoke && !ko) {
      const pts = front ? [[7, 8, CIG], [8, 8, CIG], [9, 8, '#e0602e']] : [[9, 8, CIG], [10, 8, CIG], [11, 8, '#e0602e']];
      for (const [x, y, c] of pts) { if (L.at(fx + x, fy + y) == null) L.P(fx + x, fy + y, 'skin', 0); F(x, y, c); }
      const sx = front ? 10 : 12;
      for (const [x, y] of frame % 2 ? [[sx, 7], [sx + 1, 6], [sx + 1, 4], [sx + 2, 3]] : [[sx, 7], [sx + 1, 5], [sx + 2, 4], [sx + 2, 2]]) L.O(fx + x, fy + y, y % 2 ? '#9e9ea8' : '#7e7e8a');
    }
  }

  // hair (under the hat's cut)
  const cut = hat ? hat.cut : -1;
  const tmpl = look.balding ? BALDING[view] : HAIR[hairName]?.[view];
  if (tmpl) tmpl.forEach((row, r) => {
    if (r < cut) return;
    [...row].forEach((ch, c) => {
      const x = hx + c, y = hy + r;
      if (ch in TONE) L.P(x, y, 'hair', TONE[ch]);
      else if (ch === 's') { L.P(x, y, 'hair', 0); L.O(x, y, (x + y) % 3 ? STREAK : shade(STREAK, 0.78)); }
      else if (ch === 'k') { L.P(x, y, 'skin', -1); L.O(x, y, c2 => c2 && mix(c2, C.hair, 0.38)); }
      else if (ch === 'x') L.P(x, y, 'ex', 0);
    });
  });
  if (tmpl) hairTouches(ctx, hairName, view, hx, hy, cut);
  if (look.balding && !hat) for (const [x, y] of front ? [[6, 4], [7, 4], [6, 5]] : view === 'up' ? [[6, 4], [7, 4]] : [[7, 4], [8, 4]]) L.O(hx + x, hy + y, c => c && shade(c, 1.22));

  // the hat
  if (hat) {
    const t = hat[view] ?? hat.down;
    t.forEach((row, r) => [...row].forEach((ch, c) => {
      const x = hx + c, y = hy + r;
      if (ch in TONE) L.P(x, y, 'hat', TONE[ch]);
      else if (ch === 'g' || ch === 'G') { L.P(x, y, 'hat', 0); L.O(x, y, ch === 'g' ? LENS : mix(LENS, INK, 0.45)); }
      else if (ch === 'o') L.P(x, y, 'steel', 0);
      else if (ch === 'v') L.O(x, y, c2 => c2 && mix(c2, INK, 0.45));
    }));
    // a brim throws a shadow across the brow
    if (hat.brim && view !== 'up') for (let x = hx + 3; x <= hx + 10; x++) if (L.at(x, hy + hat.cut) === 'skin') L.O(x, hy + hat.cut, c => c && shade(c, 0.8));
  }

  // things worn on the head
  if (front) {
    if (has('Glasses') || has('Eye cord')) { for (const [x, y] of [[2, 6], [5, 6], [6, 6], [9, 6]]) F(x, y, INK); for (const x of [3, 4, 7, 8]) F(x, 6, c => c && mix(c, LENS, 0.35)); F(3, 6, '#f4f8fb'); }
    if (has('Eye cord')) for (const [x, y] of [[1, 7], [1, 8], [10, 7], [10, 8]]) F(x, y, '#3a2a20');
    if (has('Round spectacles')) { for (const [x, y] of [[2, 6], [5, 6], [6, 6], [9, 6]]) F(x, y, GOLD); for (const x of [3, 4, 7, 8]) F(x, 6, c => c && mix(c, LENS, 0.25)); }
    if (has('Aviators')) { for (const [x, y] of [[2, 6], [9, 6], [5, 6], [6, 6]]) F(x, y, AV_FRAME); for (const [x, y, c] of [[3, 6, AV_L], [4, 6, AV], [7, 6, AV_L], [8, 6, AV], [3, 7, AV], [4, 7, AV_D], [7, 7, AV], [8, 7, AV_D]]) F(x, y, c); }
    if (has('Monocle')) { for (const [x, y] of [[6, 6], [9, 6], [7, 7], [8, 7]]) F(x, y, GOLD); for (const x of [7, 8]) F(x, 6, c => c && mix(c, LENS, 0.3)); F(9, 8, '#3a2a20'); F(10, 9, '#3a2a20'); }
    if (has('Earrings')) for (const x of [1, 10]) { F(x, 7, SILVER); F(x, 8, shade(SILVER, 0.75)); }
    if (has('Small hoops')) for (const x of [1, 10]) F(x, 7, GOLD);
    if (has('Hair clips')) for (const [x, y] of [[2, 4], [9, 4], [2, 5]]) F(x, y, (x + y) % 2 ? C.ex : shade(C.ex, 1.3));
  } else if (side) {
    if (has('Glasses') || has('Eye cord')) { F(9, 6, INK); for (const x of [5, 6, 7]) F(x, 6, INK); F(8, 6, c => c && mix(c, LENS, 0.4)); }
    if (has('Eye cord')) { F(5, 7, '#3a2a20'); F(5, 8, '#3a2a20'); }
    if (has('Round spectacles')) { F(9, 6, GOLD); for (const x of [5, 6, 7]) F(x, 6, GOLD); }
    if (has('Aviators')) { F(8, 6, AV_L); F(8, 7, AV); F(9, 6, AV_FRAME); for (const x of [5, 6, 7]) F(x, 6, AV_FRAME); }
    if (has('Monocle')) { F(9, 6, GOLD); F(8, 7, GOLD); }
    if (has('Earrings')) { F(4, 7, SILVER); F(4, 8, shade(SILVER, 0.75)); }
    if (has('Small hoops')) F(4, 7, GOLD);
    if (has('Hair clips')) { F(4, 3, C.ex); F(5, 3, shade(C.ex, 1.3)); }
  } else {
    if (has('Glasses') || has('Eye cord') || has('Round spectacles') || has('Aviators')) { F(2, 6, INK); F(9, 6, INK); }
    if (has('Earrings') || has('Small hoops')) for (const x of [1, 10]) F(x, 7, has('Earrings') ? SILVER : GOLD);
    if (has('Hair clips')) for (const [x, y] of [[2, 5], [9, 5]]) F(x, y, C.ex);
  }
}

// Texture and shine on top of the shapes.
function hairTouches(ctx, style, view, hx, hy, cut) {
  const { L, C } = ctx;
  const each = fn => { for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (L.mat[y][x]?.m === 'hair') fn(x, y); };
  if (style === 'Curls' || style === 'Afro') each((x, y) => { const k = (x + (Math.floor(y / 2) % 2) * 2) % 4; if (y % 2 === 0 && k === 0) L.O(x, y, c => c && shade(c, 1.3)); else if (y % 2 === 1 && k === 1) L.O(x, y, c => c && shade(c, 0.72)); });
  if (style === 'Slick back' && cut < 0) for (const [x, y] of view === 'right' ? [[5, 3], [6, 3], [7, 4]] : [[5, 3], [6, 3], [7, 3]]) L.O(hx + x, hy + y, shade(C.hair, 1.35));
  if (style === 'Streaked long') {
    const col = view === 'down' ? 10 : view === 'up' ? 3 : 4;
    each((x, y) => { if (x === hx + col && y >= hy + 3) L.O(x, y, (x + y) % 3 ? STREAK : shade(STREAK, 0.78)); });
  }
  if (style === 'Waves') each((x, y) => { const t = Math.max(0, Math.min(1, (y - hy - 8) / 6)); if (t > 0) L.O(x, y, c => c && mix(c, OMBRE, t * 0.75)); });
  if (style === 'Shaggy') each((x, y) => { if ((x * 3 + y) % 5 === 0) L.O(x, y, c => c && shade(c, 0.72)); else if ((x + y * 2) % 7 === 0) L.O(x, y, c => c && shade(c, 1.25)); });
}
