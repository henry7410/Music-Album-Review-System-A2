// Accessibility NFR: every album cover's alternative text names both the
// album title and the artist, so screen-reader users hear which album it is.
export const albumCoverAlt = (album) => `Album cover of ${album.title} by ${album.artistName}`;

const AlbumCover = ({ album }) =>
  album.coverImageUrl ? (
    <img src={album.coverImageUrl} alt={albumCoverAlt(album)} className="w-full h-full object-cover" />
  ) : (
    <span className="text-gray-400 text-sm">No cover</span>
  );

export default AlbumCover;
