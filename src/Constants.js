export const FORMAT = {
    FRANCHISE: 'franchise',
    FRANCHISE_COMMON: 'franchise-common'
};
export const GAME_TYPE = {
    MADDEN: 'madden',
    COLLEGE: 'college'
};
// zlib's default 16 KB output chunks cause multi-second GC stalls in Electron on ~32 MB outputs
export const ZLIB_CHUNK_SIZE = 1024 * 1024;
export default {
    FORMAT,
    GAME_TYPE,
    ZLIB_CHUNK_SIZE
};
