import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AlbumCover from './AlbumCover';
import AlbumCard from './AlbumCard';

const album = {
  _id: 'album-1',
  title: 'In Rainbows',
  artistName: 'Radiohead',
  coverImageUrl: 'https://example.com/in-rainbows.jpg',
  averageRating: null,
  reviewCount: 0,
};

describe('AlbumCover', () => {
  it('gives the cover image alternative text naming the album title and artist', () => {
    render(<AlbumCover album={album} />);

    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Album cover of In Rainbows by Radiohead');
  });

  it('shows a placeholder instead of an image when the album has no cover', () => {
    render(<AlbumCover album={{ ...album, coverImageUrl: '' }} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No cover')).toBeInTheDocument();
  });

  it('is used by the catalogue album card', () => {
    render(<MemoryRouter><AlbumCard album={album} /></MemoryRouter>);

    expect(screen.getByAltText('Album cover of In Rainbows by Radiohead')).toBeInTheDocument();
  });
});
