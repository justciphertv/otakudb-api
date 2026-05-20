import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../src/auth/password.js";
import { slugify } from "../src/common/sanitize.js";

const prisma = new PrismaClient();

const genres = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports"];
const tags = [
  ["Found Family", "Theme", "Characters forming a chosen family"],
  ["Space Travel", "Setting", "Stories involving interplanetary travel"],
  ["Magic School", "Setting", "Education around fantasy arts"],
  ["Cooking", "Theme", "Food preparation and culinary craft"],
  ["Tournament", "Plot", "Structured competitive arcs"],
  ["Detective", "Theme", "Investigation-focused narrative"],
  ["Robotics", "Theme", "Robots or synthetic companions"],
  ["Coming of Age", "Theme", "Personal growth through adolescence"],
  ["Music", "Theme", "Performance and composition"],
  ["Historical", "Setting", "Inspired by historical periods"]
];

async function main() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.report.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.like.deleteMany(),
    prisma.activityReply.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.reviewRating.deleteMany(),
    prisma.review.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.favourite.deleteMany(),
    prisma.mediaListEntryCustomList.deleteMany(),
    prisma.mediaListCustomList.deleteMany(),
    prisma.mediaListEntry.deleteMany(),
    prisma.airingSchedule.deleteMany(),
    prisma.mediaRelation.deleteMany(),
    prisma.mediaStaff.deleteMany(),
    prisma.mediaCharacter.deleteMany(),
    prisma.mediaStudio.deleteMany(),
    prisma.mediaTagOnMedia.deleteMany(),
    prisma.mediaTag.deleteMany(),
    prisma.mediaGenre.deleteMany(),
    prisma.genre.deleteMany(),
    prisma.mediaSynonym.deleteMany(),
    prisma.media.deleteMany(),
    prisma.character.deleteMany(),
    prisma.staff.deleteMany(),
    prisma.studio.deleteMany(),
    prisma.accessToken.deleteMany(),
    prisma.oAuthApplication.deleteMany(),
    prisma.user.deleteMany()
  ]);

  await prisma.genre.createMany({ data: genres.map((name) => ({ name })) });
  await prisma.mediaTag.createMany({
    data: tags.map(([name, category, description], index) => ({
      name,
      category,
      description,
      rank: 90 - index,
      isAdult: false,
      isGeneralSpoiler: false,
      isMediaSpoiler: false
    }))
  });

  const studios = await Promise.all(
    ["Northstar Pictures", "Blue Harbor Animation", "Kumo Works", "Lantern Frame", "Cedar Line Studio"].map((name) =>
      prisma.studio.create({ data: { name, isAnimationStudio: true, siteUrl: `https://example.com/${slugify(name)}` } })
    )
  );

  const staff = await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      prisma.staff.create({
        data: {
          nameFirst: `Staff${index + 1}`,
          nameLast: "Creator",
          nameFull: `Staff ${index + 1} Creator`,
          language: "Japanese",
          homeTown: "Fictional City",
          yearsActive: [2010 + index, 2026],
          favourites: index * 3
        }
      })
    )
  );

  const characters = await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      prisma.character.create({
        data: {
          nameFirst: `Hero${index + 1}`,
          nameLast: "Sample",
          nameFull: `Hero ${index + 1} Sample`,
          description: `Original demo character ${index + 1}.`,
          gender: index % 2 ? "Female" : "Male",
          age: String(15 + index),
          bloodType: ["A", "B", "O", "AB"][index % 4],
          favourites: index * 5
        }
      })
    )
  );

  const media = [];
  for (let i = 1; i <= 20; i++) {
    const isAnime = i <= 10;
    const title = `${isAnime ? "Skyline" : "Moonlit"} Chronicle ${i}`;
    const row = await prisma.media.create({
      data: {
        type: isAnime ? "ANIME" : "MANGA",
        format: isAnime ? (i % 3 === 0 ? "MOVIE" : "TV") : "MANGA",
        status: i % 4 === 0 ? "RELEASING" : "FINISHED",
        titleRomaji: title,
        titleEnglish: `${title} English`,
        titleNative: `Sample Native ${i}`,
        slug: slugify(title),
        description: `A lawful fictional sample ${isAnime ? "anime" : "manga"} entry about friendship, mystery, and discovery.`,
        startDateYear: 2010 + i,
        startDateMonth: ((i - 1) % 12) + 1,
        startDateDay: 1,
        season: ["WINTER", "SPRING", "SUMMER", "FALL"][i % 4] as any,
        seasonYear: 2010 + i,
        episodes: isAnime ? 12 + i : null,
        duration: isAnime ? 24 : null,
        chapters: isAnime ? null : 40 + i,
        volumes: isAnime ? null : 5 + (i % 5),
        countryOfOrigin: "JP",
        source: isAnime ? "ORIGINAL" : "OTHER",
        coverImageLarge: `https://picsum.photos/seed/otakudb-${i}/600/900`,
        coverImageMedium: `https://picsum.photos/seed/otakudb-${i}/300/450`,
        averageScore: 60 + (i % 35),
        meanScore: 58 + (i % 35),
        popularity: 1000 - i * 20,
        favourites: i * 7,
        trending: 200 - i,
        isAdult: false,
        isLicensed: false
      }
    });
    media.push(row);
    await prisma.mediaSynonym.create({ data: { mediaId: row.id, text: `${title} Alt` } });
    await prisma.mediaGenre.create({ data: { mediaId: row.id, genreId: ((i - 1) % genres.length) + 1 } });
    await prisma.mediaTagOnMedia.create({ data: { mediaId: row.id, tagId: ((i - 1) % tags.length) + 1, rank: 80 } });
    await prisma.mediaStudio.create({ data: { mediaId: row.id, studioId: studios[(i - 1) % studios.length].id, isMain: true } });
    await prisma.mediaCharacter.create({
      data: {
        mediaId: row.id,
        characterId: characters[(i - 1) % characters.length].id,
        role: i % 2 ? "MAIN" : "SUPPORTING",
        voiceActorId: staff[(i - 1) % staff.length].id,
        language: "Japanese"
      }
    });
    await prisma.mediaStaff.create({ data: { mediaId: row.id, staffId: staff[(i - 1) % staff.length].id, role: "Director" } });
    if (isAnime) {
      await prisma.airingSchedule.create({
        data: {
          mediaId: row.id,
          airingAt: Math.floor(Date.now() / 1000) + i * 86400,
          timeUntilAiring: i * 86400,
          episode: i
        }
      });
    }
  }

  for (let i = 0; i < 5; i++) {
    await prisma.mediaRelation.create({
      data: { mediaId: media[i].id, relatedMediaId: media[i + 10].id, relationType: "ADAPTATION" }
    });
  }

  const passwordHash = await hashPassword("password123");
  const admin = await prisma.user.create({
    data: { email: "admin@example.com", name: "admin", passwordHash, role: UserRole.ADMIN, timezone: "America/Chicago" }
  });
  const demo = await prisma.user.create({
    data: { email: "demo@example.com", name: "demo", passwordHash, timezone: "America/Chicago" }
  });
  const reader = await prisma.user.create({
    data: { email: "reader@example.com", name: "reader", passwordHash, timezone: "America/Chicago" }
  });

  await prisma.oAuthApplication.create({
    data: {
      ownerUserId: admin.id,
      name: "Demo Local Client",
      clientId: "demo_client",
      clientSecretHash: await hashPassword("demo_secret"),
      redirectUris: ["http://localhost:3000/oauth/callback"]
    }
  });

  for (const [index, item] of media.slice(0, 8).entries()) {
    await prisma.mediaListEntry.create({
      data: {
        userId: demo.id,
        mediaId: item.id,
        status: index % 2 ? "PLANNING" : "CURRENT",
        score: 8 + index / 10,
        scoreRaw: 80 + index,
        progress: index + 1,
        private: index === 7
      }
    });
  }

  await prisma.follow.create({ data: { followerId: demo.id, followingId: reader.id } });
  await prisma.favourite.create({ data: { userId: demo.id, mediaId: media[0].id, type: "ANIME" } });
  await prisma.favourite.create({ data: { userId: demo.id, characterId: characters[0].id, type: "CHARACTER" } });

  const review = await prisma.review.create({
    data: {
      userId: demo.id,
      mediaId: media[0].id,
      summary: "Strong demo premiere",
      body: "A concise fictional review for testing.",
      score: 85,
      rating: 1,
      ratingAmount: 1
    }
  });
  await prisma.reviewRating.create({ data: { reviewId: review.id, userId: reader.id, rating: "UPVOTE" } });

  const activity = await prisma.activity.create({ data: { userId: demo.id, type: "TEXT", text: "Started tracking a new series." } });
  await prisma.activityReply.create({ data: { activityId: activity.id, userId: reader.id, text: "Good pick." } });
  await prisma.like.create({ data: { userId: reader.id, targetType: "ACTIVITY", targetId: activity.id } });
  await prisma.notification.create({
    data: { userId: demo.id, actorId: reader.id, activityId: activity.id, type: "ACTIVITY_REPLY", context: "replied to your activity" }
  });
  await prisma.report.create({
    data: { reporterId: reader.id, targetType: "REVIEW", targetId: review.id, reason: "Demo moderation report" }
  });
  await prisma.auditLog.create({
    data: { actorId: admin.id, action: "SEED", targetType: "DATABASE", targetId: 1, metadata: { seeded: true } }
  });
}

main()
  .then(async () => {
    console.log("Seed completed");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
