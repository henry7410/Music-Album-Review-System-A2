import { Link } from 'react-router-dom';
import AlbumCover from './AlbumCover';

const AlbumCard = ({ album }) => (
  <Link to={`/albums/${album._id}`} className="bg-white shadow-md rounded overflow-hidden block">
    <div className="aspect-square bg-gray-100 flex items-center justify-center">
      <AlbumCover album={album} />
    </div>
    <div className="p-3">
      <h3 className="font-semibold truncate">{album.title}</h3>
      <p className="text-sm text-gray-600 truncate">{album.artistName}</p>
      <p className="text-sm text-gray-400 mt-1">
        {album.averageRating != null
          ? `★ ${album.averageRating.toFixed(1)} (${album.reviewCount})`
          : 'No ratings yet'}
      </p>
    </div>
  </Link>
);

export default AlbumCard;
