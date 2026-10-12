const { expect } = require('chai');
const { buildModerationRows } = require('../controllers/moderationController');

const group = (id, flagCount, reasons, latestFlaggedAt = new Date('2026-10-01')) => ({
    _id: id,
    flagCount,
    latestFlaggedAt,
    reasons,
});

const review = (id, overrides = {}) => ({
    _id: id,
    stars: 2,
    comment: 'Not for me.',
    createdAt: new Date('2026-09-01'),
    userId: { _id: 'u1', name: 'Brad' },
    albumId: { _id: 'a1', title: 'Thriller', artistName: 'Michael Jackson' },
    ...overrides,
});

describe('Moderation: buildModerationRows', () => {
    it('returns one flat row per review with a reason breakdown', () => {
        const rows = buildModerationRows([group('r1', 3, ['Rude', 'Spam', 'Rude'])], [review('r1')]);

        expect(rows).to.deep.equal([
            {
                reviewId: 'r1',
                flagCount: 3,
                latestFlaggedAt: new Date('2026-10-01'),
                reasons: [
                    { reason: 'Rude', count: 2 },
                    { reason: 'Spam', count: 1 },
                ],
                stars: 2,
                comment: 'Not for me.',
                createdAt: new Date('2026-09-01'),
                authorName: 'Brad',
                albumId: 'a1',
                albumTitle: 'Thriller',
                artistName: 'Michael Jackson',
            },
        ]);
    });

    it('keeps the aggregation order rather than the order reviews were loaded in', () => {
        const rows = buildModerationRows(
            [group('r2', 1, ['Spam']), group('r1', 1, ['Rude'])],
            [review('r1'), review('r2')]
        );

        expect(rows.map((row) => row.reviewId)).to.deep.equal(['r2', 'r1']);
    });

    it('falls back to "Deleted user" when the author no longer exists', () => {
        const [row] = buildModerationRows([group('r1', 1, ['Rude'])], [review('r1', { userId: null })]);

        expect(row.authorName).to.equal('Deleted user');
    });

    it('falls back to "Deleted album" when the album no longer exists', () => {
        const [row] = buildModerationRows([group('r1', 1, ['Rude'])], [review('r1', { albumId: null })]);

        expect(row.albumId).to.equal(null);
        expect(row.albumTitle).to.equal('Deleted album');
        expect(row.artistName).to.equal('Deleted album');
    });

    it('drops a row whose review no longer exists', () => {
        const rows = buildModerationRows([group('gone', 1, ['Spam']), group('r1', 1, ['Rude'])], [review('r1')]);

        expect(rows.map((row) => row.reviewId)).to.deep.equal(['r1']);
    });

    it('never exposes the author email', () => {
        const [row] = buildModerationRows(
            [group('r1', 1, ['Rude'])],
            [review('r1', { userId: { _id: 'u1', name: 'Brad', email: 'brad@example.com' } })]
        );

        expect(JSON.stringify(row)).not.to.include('brad@example.com');
    });
});
