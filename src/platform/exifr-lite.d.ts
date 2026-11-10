// The "lite" build of exifr (smaller; reads JPEG, HEIC and TIFF) shares the main types.
declare module 'exifr/dist/lite.esm.mjs' {
  import exifr from 'exifr'
  export default exifr
}
