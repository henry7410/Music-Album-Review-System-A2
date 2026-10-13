
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Album = require('../models/Album');
const User = require('../models/User');
const Review = require('../models/Review');

// Demo accounts only — this password is deliberately public (documented in
// the README), not a committed secret. Real accounts always go through
// registration and get their own password.
const DEMO_PASSWORD = 'Demo1234!';

// name is derived the same way registration derives it. createdAt is a fixed
// backdated registration date, written by the native-driver call in the seed loop.
const demoUsers = [
    { email: 'brad@example.com', firstName: 'Brad', lastName: 'Hsu', username: 'brad', createdAt: new Date('2026-10-02T19:42:00Z') },
    { email: 'mika@example.com', firstName: 'Mika', lastName: 'Tseng', username: 'mika', createdAt: new Date('2026-10-02T21:05:00Z') },
    { email: 'henry@example.com', firstName: 'Henry', lastName: 'Chan', username: 'henry', createdAt: new Date('2026-10-03T13:18:00Z') },
    { email: 'kenny@example.com', firstName: 'Kenny', lastName: 'Lan', username: 'kenny', createdAt: new Date('2026-10-04T10:27:00Z') },
    { email: 'jasmine@example.com', firstName: 'Jasmine', lastName: 'Wang', username: 'jasmine', createdAt: new Date('2026-10-05T16:53:00Z') },
    { email: 'dio@example.com', firstName: 'Dio', lastName: 'Brando', username: 'dio', createdAt: new Date('2026-10-06T22:11:00Z') },
    { email: 'giorno@example.com', firstName: 'Giorno', lastName: 'Giovanna', username: 'giorno', createdAt: new Date('2026-10-07T11:36:00Z') },
    { email: 'jolene@example.com', firstName: 'Jolene', lastName: 'Cujoh', username: 'jolene', createdAt: new Date('2026-10-08T14:09:00Z') },
    { email: 'josuke@example.com', firstName: 'Josuke', lastName: 'Higashikata', username: 'josuke', createdAt: new Date('2026-10-09T18:24:00Z') },
].map((demoUser) => ({ ...demoUser, name: `${demoUser.firstName} ${demoUser.lastName}` }));

// Accounts inactive for more than five years, so the inactive-account
// deletion story can be demonstrated. They deliberately have no reviews:
// deleting a user cascades to their reviews, so any reviews here would
// vanish during the demo and shift the catalogue's ratings, and an account
// idle for years should not have recent reviews anyway.
const yearsAgo = (years) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return date;
};

const inactiveDemoUsers = [
    {
        name: 'Inactive Demo 1',
        email: 'inactive1@example.com',
        firstName: 'Inactive',
        lastName: 'Demo 1',
        username: 'inactive_demo_1',
        createdAt: yearsAgo(8),
        lastActivity: yearsAgo(6),
    },
    {
        name: 'Inactive Demo 2',
        email: 'inactive2@example.com',
        firstName: 'Inactive',
        lastName: 'Demo 2',
        username: 'inactive_demo_2',
        createdAt: yearsAgo(9),
        lastActivity: yearsAgo(7),
    },
];

// Admin accounts are never created through registration (they are promoted
// directly in the database), so the seed is what makes this one restorable.
// role is part of the profile, so every run also restores the admin role.
const adminDemoUser = {
    name: 'Admin Demo',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'Demo',
    username: 'admin_demo',
    role: 'admin',
    createdAt: new Date('2026-10-01T08:30:00Z'),
};

const albums = [
    {
        title: 'Thriller',
        artistName: 'Michael Jackson',
        releaseYear: 1982,
        coverImageUrl: 'https://images.unsplash.com/photo-1730861679144-dc64ce756668?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
        tracks: [
            { trackNumber: 1, title: 'Wanna Be Startin\' Somethin\'', durationSec: 363 },
            { trackNumber: 2, title: 'Baby Be Mine', durationSec: 260 },
            { trackNumber: 3, title: 'The Girl Is Mine', durationSec: 242 },
            { trackNumber: 4, title: 'Thriller', durationSec: 357 },
            { trackNumber: 5, title: 'Beat It', durationSec: 258 },
            { trackNumber: 6, title: 'Billie Jean', durationSec: 294 },
            { trackNumber: 7, title: 'Human Nature', durationSec: 246 },
        ],
    },
    {
        title: 'Abbey Road',
        artistName: 'The Beatles',
        releaseYear: 1969,
        coverImageUrl: 'https://images.unsplash.com/photo-1553198194-1b81858f6436?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
        tracks: [
            { trackNumber: 1, title: 'Come Together', durationSec: 259 },
            { trackNumber: 2, title: 'Something', durationSec: 183 },
            { trackNumber: 3, title: 'Maxwell\'s Silver Hammer', durationSec: 207 },
            { trackNumber: 4, title: 'Oh! Darling', durationSec: 207 },
            { trackNumber: 5, title: 'Here Comes the Sun', durationSec: 185 },
            { trackNumber: 6, title: 'Because', durationSec: 165 },
        ],
    },
    {
        title: 'Rumours',
        artistName: 'Fleetwood Mac',
        releaseYear: 1977,
        coverImageUrl: 'https://images.unsplash.com/photo-1766183683881-2d4a706f5588?q=80&w=1065&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
        tracks: [
            { trackNumber: 1, title: 'Second Hand News', durationSec: 163 },
            { trackNumber: 2, title: 'Dreams', durationSec: 257 },
            { trackNumber: 3, title: 'Never Going Back Again', durationSec: 132 },
            { trackNumber: 4, title: 'Don\'t Stop', durationSec: 191 },
            { trackNumber: 5, title: 'Go Your Own Way', durationSec: 218 },
            { trackNumber: 6, title: 'The Chain', durationSec: 268 },
        ],
    },
    {
        title: 'Back in Black',
        artistName: 'AC/DC',
        releaseYear: 1980,
        coverImageUrl: 'https://images.unsplash.com/photo-1520262494112-9fe481d36ec3?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
        tracks: [
            { trackNumber: 1, title: 'Hells Bells', durationSec: 312 },
            { trackNumber: 2, title: 'Shoot to Thrill', durationSec: 318 },
            { trackNumber: 3, title: 'Back in Black', durationSec: 255 },
            { trackNumber: 4, title: 'You Shook Me All Night Long', durationSec: 210 },
            { trackNumber: 5, title: 'Rock and Roll Ain\'t Noise Pollution', durationSec: 267 },
        ],
    },
    {
        title: 'The Dark Side of the Moon',
        artistName: 'Pink Floyd',
        releaseYear: 1973,
        coverImageUrl: 'https://images.unsplash.com/photo-1773543335853-d022b8a27209?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
        tracks: [
            { trackNumber: 1, title: 'Speak to Me', durationSec: 90 },
            { trackNumber: 2, title: 'Breathe', durationSec: 163 },
            { trackNumber: 3, title: 'Time', durationSec: 421 },
            { trackNumber: 4, title: 'The Great Gig in the Sky', durationSec: 276 },
            { trackNumber: 5, title: 'Money', durationSec: 382 },
            { trackNumber: 6, title: 'Us and Them', durationSec: 469 },
        ],
    },
    {
        title: 'Nevermind',
        artistName: 'Nirvana',
        releaseYear: 1991,
        coverImageUrl: 'https://images.unsplash.com/photo-1644855640845-ab57a047320e?q=80&w=1036&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
        tracks: [
            { trackNumber: 1, title: 'Smells Like Teen Spirit', durationSec: 301 },
            { trackNumber: 2, title: 'In Bloom', durationSec: 254 },
            { trackNumber: 3, title: 'Come as You Are', durationSec: 219 },
            { trackNumber: 4, title: 'Lithium', durationSec: 257 },
            { trackNumber: 5, title: 'Polly', durationSec: 177 },
        ],
    },
    {
        title: 'Hotel California',
        artistName: 'Eagles',
        releaseYear: 1976,
        coverImageUrl: 'https://images.unsplash.com/photo-1652057295518-d2a109170821?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
        tracks: [
            { trackNumber: 1, title: 'Hotel California', durationSec: 391 },
            { trackNumber: 2, title: 'New Kid in Town', durationSec: 304 },
            { trackNumber: 3, title: 'Life in the Fast Lane', durationSec: 286 },
            { trackNumber: 4, title: 'Wasted Time', durationSec: 271 },
        ],
    },
    {
        title: 'Purple Rain',
        artistName: 'Prince',
        releaseYear: 1984,
        coverImageUrl: 'https://images.unsplash.com/photo-1511800453077-8c0afa94175f?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
        tracks: [
            { trackNumber: 1, title: 'Let\'s Go Crazy', durationSec: 278 },
            { trackNumber: 2, title: 'Take Me with U', durationSec: 234 },
            { trackNumber: 3, title: 'The Beautiful Ones', durationSec: 315 },
            { trackNumber: 4, title: 'When Doves Cry', durationSec: 342 },
            { trackNumber: 5, title: 'Purple Rain', durationSec: 520 },
        ],
    },
    {
        title: '21',
        artistName: 'Adele',
        releaseYear: 2011,
        coverImageUrl: 'https://images.unsplash.com/photo-1744846960872-2265db6d0c84?q=80&w=1064&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
        tracks: [
            { trackNumber: 1, title: 'Rolling in the Deep', durationSec: 228 },
            { trackNumber: 2, title: 'Rumour Has It', durationSec: 224 },
            { trackNumber: 3, title: 'Turning Tables', durationSec: 264 },
            { trackNumber: 4, title: 'Someone Like You', durationSec: 285 },
        ],
    },
    {
        title: 'Random Access Memories',
        artistName: 'Daft Punk',
        releaseYear: 2013,
        coverImageUrl: 'https://images.unsplash.com/photo-1711054824441-064a99073a0b?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
        tracks: [
            { trackNumber: 1, title: 'Give Life Back to Music', durationSec: 274 },
            { trackNumber: 2, title: 'Get Lucky', durationSec: 369 },
            { trackNumber: 3, title: 'Within', durationSec: 229 },
            { trackNumber: 4, title: 'Instant Crush', durationSec: 337 },
            { trackNumber: 5, title: 'Doin\' It Right', durationSec: 253 },
        ],
    },
    // Deliberately left out of albumReviews below, so this is the one album
    // demonstrating the "No ratings yet" state.
    {
        title: 'In Rainbows',
        artistName: 'Radiohead',
        releaseYear: 2007,
        coverImageUrl: 'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
        tracks: [
            { trackNumber: 1, title: '15 Step', durationSec: 237 },
            { trackNumber: 2, title: 'Bodysnatchers', durationSec: 243 },
            { trackNumber: 3, title: 'Nude', durationSec: 254 },
            { trackNumber: 4, title: 'Weird Fishes/Arpeggi', durationSec: 318 },
            { trackNumber: 5, title: 'Reckoner', durationSec: 291 },
        ],
    },
];

// Ratings deliberately vary in both count and value per album: In Rainbows
// gets none at all (the "No ratings yet" case), Abbey Road gets a single
// review, Thriller gets six averaging a non-round 4.3, and the rest fall
// in between — demonstrating FR-09's one-decimal rounding on more than
// just the one required example.
const albumReviews = {
    Thriller: [
        { user: 'Mika', stars: 5, comment: 'Still gets me dancing every time.' },
        { user: 'Henry', stars: 5, comment: 'A masterclass in pop production.' },
        { user: 'Kenny', stars: 4, comment: 'Billie Jean alone is worth it.' },
        { user: 'Brad', stars: 4, comment: 'Some filler but the hits are massive.' },
        { user: 'Jasmine', stars: 3, comment: 'Good, just not my personal favourite era.' },
        { user: 'Josuke', stars: 5, comment: 'Timeless. My parents played this on repeat.' },
    ],
    'Abbey Road': [
        { user: 'Dio', stars: 5, comment: 'Side two is one continuous piece of genius.' },
    ],
    Rumours: [
        { user: 'Giorno', stars: 4, comment: 'Dreams is the standout for me.' },
        { user: 'Jolene', stars: 5, comment: 'Every track could be a single.' },
    ],
    'Back in Black': [
        { user: 'Henry', stars: 4, comment: 'Riffs for days.' },
        { user: 'Kenny', stars: 5, comment: 'Angus never misses.' },
        { user: 'Brad', stars: 4, comment: 'Loud, simple, and it works.' },
    ],
    'The Dark Side of the Moon': [
        { user: 'Mika', stars: 5, comment: 'Headphones required.' },
        { user: 'Jasmine', stars: 4, comment: 'Money still sounds ahead of its time.' },
        { user: 'Dio', stars: 5, comment: 'The Great Gig in the Sky gives me chills.' },
        { user: 'Josuke', stars: 3, comment: 'Great production, a bit slow for my taste.' },
    ],
    Nevermind: [
        { user: 'Kenny', stars: 5, comment: 'Changed rock music overnight.' },
        { user: 'Giorno', stars: 4, comment: 'Raw and honest.' },
        { user: 'Jolene', stars: 4, comment: 'Come as You Are is underrated.' },
        { user: 'Jasmine', stars: 5, comment: "Still hits as hard as it did in '91." },
        { user: 'Henry', stars: 3, comment: 'Iconic but not my genre.' },
    ],
    'Hotel California': [
        { user: 'Brad', stars: 5, comment: 'That guitar solo earns the five stars alone.' },
        { user: 'Josuke', stars: 4, comment: 'A little long but beautifully arranged.' },
    ],
    'Purple Rain': [
        { user: 'Mika', stars: 5, comment: 'Prince at his absolute peak.' },
        { user: 'Jolene', stars: 5, comment: 'The title track is a masterpiece.' },
        { user: 'Giorno', stars: 4, comment: 'When Doves Cry is unlike anything else.' },
    ],
    21: [
        { user: 'Jasmine', stars: 5, comment: 'Someone Like You still wrecks me.' },
        { user: 'Kenny', stars: 4, comment: 'Powerhouse vocals throughout.' },
        { user: 'Dio', stars: 4, comment: 'Consistent from start to finish.' },
        { user: 'Henry', stars: 5, comment: 'Adele at her most powerful.' },
    ],
    'Random Access Memories': [
        { user: 'Brad', stars: 4, comment: 'Get Lucky is impossible not to dance to.' },
        { user: 'Josuke', stars: 5, comment: 'A love letter to disco done right.' },
    ],
};

const seedAlbums = async () => {
    await connectDB();

    let albumsCreated = 0;
    let albumsUpdated = 0;
    const albumIdByTitle = {};

    for (const album of albums) {
        const { coverImageUrl, ...rest } = album;
        // Covers are curated by hand through the admin form, so the seed only
        // sets one when it inserts a new album ($setOnInsert). It never
        // overwrites or unsets an existing cover.
        const update = coverImageUrl !== undefined
            ? { $set: rest, $setOnInsert: { coverImageUrl } }
            : { $set: rest };

        const result = await Album.findOneAndUpdate(
            { title: album.title, artistName: album.artistName },
            update,
            { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true, rawResult: true }
        );
        albumIdByTitle[album.title] = result.value._id;
        if (result.lastErrorObject?.updatedExisting) {
            albumsUpdated += 1;
        } else {
            albumsCreated += 1;
        }
    }

    let usersCreated = 0;
    // Keyed by firstName, which is what albumReviews refers to.
    const userIdByFirstName = {};
    const allDemoUsers = [
        ...demoUsers.map((demoUser) => ({ ...demoUser, lastActivity: new Date() })),
        ...inactiveDemoUsers,
        { ...adminDemoUser, lastActivity: new Date() },
    ];

    for (const { email, createdAt, ...profile } of allDemoUsers) {
        let user = await User.findOne({ email });
        if (!user) {
            // Goes through .save() so the schema's pre-save hook bcrypt-hashes
            // the password — a findOneAndUpdate upsert would bypass it.
            user = await User.create({
                role: 'user',
                ...profile,
                email,
                password: DEMO_PASSWORD,
            });
            usersCreated += 1;
        }

        // Applied on every run, so users created before these fields existed
        // are backfilled. updateOne never touches the password.
        await User.updateOne({ _id: user._id }, { $set: profile });

        // timestamps: true makes createdAt immutable, so Mongoose silently
        // strips it from any update (even with { timestamps: false }). Write
        // it through the native driver, bypassing casting for this field only.
        if (createdAt) {
            await User.collection.updateOne({ _id: user._id }, { $set: { createdAt } });
        }
        userIdByFirstName[profile.firstName] = user._id;
    }

    let reviewsCreated = 0;
    let reviewsUpdated = 0;

    for (const [albumTitle, reviews] of Object.entries(albumReviews)) {
        const albumId = albumIdByTitle[albumTitle];
        for (const { user, stars, comment } of reviews) {
            const userId = userIdByFirstName[user];
            if (!userId) throw new Error(`Review on "${albumTitle}" refers to unknown demo user "${user}"`);
            const result = await Review.findOneAndUpdate(
                { userId, albumId },
                { userId, albumId, stars, comment },
                { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true, rawResult: true }
            );
            if (result.lastErrorObject?.updatedExisting) {
                reviewsUpdated += 1;
            } else {
                reviewsCreated += 1;
            }
        }
    }

    console.log(`Albums: ${albumsCreated} created, ${albumsUpdated} updated, ${albums.length} total.`);
    console.log(`Demo users: ${usersCreated} created, ${allDemoUsers.length - usersCreated} already existed.`);
    console.log(`Reviews: ${reviewsCreated} created, ${reviewsUpdated} updated.`);
    console.log(
        `Catalogue is populated and ready to verify at ${process.env.APP_URL || 'http://localhost:3000'} ` +
        '(swap in the EC2 deployment URL once MAR-20 is live).'
    );

    await mongoose.disconnect();
    process.exit(0);
};

seedAlbums().catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exit(1);
});
