-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserTitleLanguage" AS ENUM ('ROMAJI', 'ENGLISH', 'NATIVE');

-- CreateEnum
CREATE TYPE "ScoreFormat" AS ENUM ('POINT_100', 'POINT_10_DECIMAL', 'POINT_10', 'POINT_5', 'POINT_3');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('ANIME', 'MANGA');

-- CreateEnum
CREATE TYPE "MediaFormat" AS ENUM ('TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC', 'MANGA', 'NOVEL', 'ONE_SHOT');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS');

-- CreateEnum
CREATE TYPE "MediaSeason" AS ENUM ('WINTER', 'SPRING', 'SUMMER', 'FALL');

-- CreateEnum
CREATE TYPE "MediaSource" AS ENUM ('ORIGINAL', 'MANGA', 'LIGHT_NOVEL', 'VISUAL_NOVEL', 'VIDEO_GAME', 'OTHER');

-- CreateEnum
CREATE TYPE "CharacterRole" AS ENUM ('MAIN', 'SUPPORTING', 'BACKGROUND');

-- CreateEnum
CREATE TYPE "MediaRelationType" AS ENUM ('ADAPTATION', 'PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY', 'CHARACTER', 'SUMMARY', 'ALTERNATIVE', 'SPIN_OFF', 'OTHER', 'SOURCE', 'COMPILATION', 'CONTAINS');

-- CreateEnum
CREATE TYPE "MediaListStatus" AS ENUM ('CURRENT', 'PLANNING', 'COMPLETED', 'DROPPED', 'PAUSED', 'REPEATING');

-- CreateEnum
CREATE TYPE "FavouriteType" AS ENUM ('ANIME', 'MANGA', 'CHARACTER', 'STAFF', 'STUDIO');

-- CreateEnum
CREATE TYPE "ReviewRatingValue" AS ENUM ('UPVOTE', 'DOWNVOTE');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('TEXT', 'MESSAGE', 'MEDIA_LIST');

-- CreateEnum
CREATE TYPE "LikeTargetType" AS ENUM ('ACTIVITY', 'ACTIVITY_REPLY', 'REVIEW');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED', 'ACTIONED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarImage" TEXT,
    "bannerImage" TEXT,
    "about" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "titleLanguage" "UserTitleLanguage" NOT NULL DEFAULT 'ROMAJI',
    "scoreFormat" "ScoreFormat" NOT NULL DEFAULT 'POINT_10_DECIMAL',
    "displayAdultContent" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthApplication" (
    "id" SERIAL NOT NULL,
    "ownerUserId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT NOT NULL,
    "redirectUris" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "applicationId" INTEGER,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" SERIAL NOT NULL,
    "idMal" INTEGER,
    "type" "MediaType" NOT NULL,
    "format" "MediaFormat" NOT NULL,
    "status" "MediaStatus" NOT NULL,
    "titleRomaji" TEXT NOT NULL,
    "titleEnglish" TEXT,
    "titleNative" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDateYear" INTEGER,
    "startDateMonth" INTEGER,
    "startDateDay" INTEGER,
    "endDateYear" INTEGER,
    "endDateMonth" INTEGER,
    "endDateDay" INTEGER,
    "season" "MediaSeason",
    "seasonYear" INTEGER,
    "episodes" INTEGER,
    "duration" INTEGER,
    "chapters" INTEGER,
    "volumes" INTEGER,
    "countryOfOrigin" TEXT,
    "source" "MediaSource",
    "hashtag" TEXT,
    "trailerId" TEXT,
    "trailerSite" TEXT,
    "coverImageLarge" TEXT,
    "coverImageMedium" TEXT,
    "bannerImage" TEXT,
    "averageScore" INTEGER NOT NULL DEFAULT 0,
    "meanScore" INTEGER NOT NULL DEFAULT 0,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "favourites" INTEGER NOT NULL DEFAULT 0,
    "trending" INTEGER NOT NULL DEFAULT 0,
    "isAdult" BOOLEAN NOT NULL DEFAULT false,
    "isLicensed" BOOLEAN NOT NULL DEFAULT false,
    "siteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaSynonym" (
    "id" SERIAL NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "MediaSynonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaGenre" (
    "mediaId" INTEGER NOT NULL,
    "genreId" INTEGER NOT NULL,

    CONSTRAINT "MediaGenre_pkey" PRIMARY KEY ("mediaId","genreId")
);

-- CreateTable
CREATE TABLE "MediaTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "isAdult" BOOLEAN NOT NULL DEFAULT false,
    "isGeneralSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "isMediaSpoiler" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MediaTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaTagOnMedia" (
    "mediaId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "isSpoiler" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MediaTagOnMedia_pkey" PRIMARY KEY ("mediaId","tagId")
);

-- CreateTable
CREATE TABLE "Studio" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isAnimationStudio" BOOLEAN NOT NULL DEFAULT true,
    "siteUrl" TEXT,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaStudio" (
    "mediaId" INTEGER NOT NULL,
    "studioId" INTEGER NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MediaStudio_pkey" PRIMARY KEY ("mediaId","studioId")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" SERIAL NOT NULL,
    "nameFirst" TEXT,
    "nameMiddle" TEXT,
    "nameLast" TEXT,
    "nameFull" TEXT NOT NULL,
    "nameNative" TEXT,
    "description" TEXT,
    "imageLarge" TEXT,
    "imageMedium" TEXT,
    "gender" TEXT,
    "dateOfBirthYear" INTEGER,
    "dateOfBirthMonth" INTEGER,
    "dateOfBirthDay" INTEGER,
    "age" TEXT,
    "bloodType" TEXT,
    "favourites" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "nameFirst" TEXT,
    "nameMiddle" TEXT,
    "nameLast" TEXT,
    "nameFull" TEXT NOT NULL,
    "nameNative" TEXT,
    "description" TEXT,
    "imageLarge" TEXT,
    "imageMedium" TEXT,
    "language" TEXT,
    "homeTown" TEXT,
    "dateOfBirthYear" INTEGER,
    "dateOfBirthMonth" INTEGER,
    "dateOfBirthDay" INTEGER,
    "dateOfDeathYear" INTEGER,
    "dateOfDeathMonth" INTEGER,
    "dateOfDeathDay" INTEGER,
    "age" INTEGER,
    "yearsActive" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "favourites" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaCharacter" (
    "id" SERIAL NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "role" "CharacterRole" NOT NULL,
    "voiceActorId" INTEGER,
    "language" TEXT,

    CONSTRAINT "MediaCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaStaff" (
    "id" SERIAL NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "staffId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "MediaStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaRelation" (
    "id" SERIAL NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "relatedMediaId" INTEGER NOT NULL,
    "relationType" "MediaRelationType" NOT NULL,

    CONSTRAINT "MediaRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiringSchedule" (
    "id" SERIAL NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "airingAt" INTEGER NOT NULL,
    "timeUntilAiring" INTEGER NOT NULL,
    "episode" INTEGER NOT NULL,

    CONSTRAINT "AiringSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaListEntry" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "status" "MediaListStatus" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreRaw" INTEGER NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "progressVolumes" INTEGER,
    "repeat" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "hiddenFromStatusLists" BOOLEAN NOT NULL DEFAULT false,
    "startedAtYear" INTEGER,
    "startedAtMonth" INTEGER,
    "startedAtDay" INTEGER,
    "completedAtYear" INTEGER,
    "completedAtMonth" INTEGER,
    "completedAtDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaListCustomList" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "MediaListCustomList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaListEntryCustomList" (
    "entryId" INTEGER NOT NULL,
    "customListId" INTEGER NOT NULL,

    CONSTRAINT "MediaListEntryCustomList_pkey" PRIMARY KEY ("entryId","customListId")
);

-- CreateTable
CREATE TABLE "Favourite" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "mediaId" INTEGER,
    "characterId" INTEGER,
    "staffId" INTEGER,
    "studioId" INTEGER,
    "type" "FavouriteType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favourite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" SERIAL NOT NULL,
    "followerId" INTEGER NOT NULL,
    "followingId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "ratingAmount" INTEGER NOT NULL DEFAULT 0,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRating" (
    "id" SERIAL NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" "ReviewRatingValue" NOT NULL,

    CONSTRAINT "ReviewRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "ActivityType" NOT NULL,
    "text" TEXT,
    "messageRecipientId" INTEGER,
    "mediaListEntryId" INTEGER,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityReply" (
    "id" SERIAL NOT NULL,
    "activityId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "targetType" "LikeTargetType" NOT NULL,
    "targetId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" INTEGER,
    "activityId" INTEGER,
    "mediaId" INTEGER,
    "context" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthApplication_clientId_key" ON "OAuthApplication"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessToken_tokenHash_key" ON "AccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AccessToken_userId_idx" ON "AccessToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_idMal_key" ON "Media"("idMal");

-- CreateIndex
CREATE UNIQUE INDEX "Media_slug_key" ON "Media"("slug");

-- CreateIndex
CREATE INDEX "Media_type_idx" ON "Media"("type");

-- CreateIndex
CREATE INDEX "Media_status_idx" ON "Media"("status");

-- CreateIndex
CREATE INDEX "Media_season_seasonYear_idx" ON "Media"("season", "seasonYear");

-- CreateIndex
CREATE INDEX "Media_popularity_idx" ON "Media"("popularity");

-- CreateIndex
CREATE INDEX "MediaSynonym_mediaId_idx" ON "MediaSynonym"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MediaTag_name_key" ON "MediaTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Studio_name_key" ON "Studio"("name");

-- CreateIndex
CREATE INDEX "Character_nameFull_idx" ON "Character"("nameFull");

-- CreateIndex
CREATE INDEX "Staff_nameFull_idx" ON "Staff"("nameFull");

-- CreateIndex
CREATE INDEX "MediaCharacter_mediaId_idx" ON "MediaCharacter"("mediaId");

-- CreateIndex
CREATE INDEX "MediaCharacter_characterId_idx" ON "MediaCharacter"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaRelation_mediaId_relatedMediaId_relationType_key" ON "MediaRelation"("mediaId", "relatedMediaId", "relationType");

-- CreateIndex
CREATE INDEX "AiringSchedule_mediaId_airingAt_idx" ON "AiringSchedule"("mediaId", "airingAt");

-- CreateIndex
CREATE INDEX "MediaListEntry_userId_status_idx" ON "MediaListEntry"("userId", "status");

-- CreateIndex
CREATE INDEX "MediaListEntry_mediaId_idx" ON "MediaListEntry"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaListEntry_userId_mediaId_key" ON "MediaListEntry"("userId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaListCustomList_userId_name_key" ON "MediaListCustomList"("userId", "name");

-- CreateIndex
CREATE INDEX "Favourite_userId_type_idx" ON "Favourite"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRating_reviewId_userId_key" ON "ReviewRating"("reviewId", "userId");

-- CreateIndex
CREATE INDEX "Activity_userId_createdAt_idx" ON "Activity"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_targetType_targetId_key" ON "Like"("userId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "OAuthApplication" ADD CONSTRAINT "OAuthApplication_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OAuthApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaSynonym" ADD CONSTRAINT "MediaSynonym_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaGenre" ADD CONSTRAINT "MediaGenre_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaGenre" ADD CONSTRAINT "MediaGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaTagOnMedia" ADD CONSTRAINT "MediaTagOnMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaTagOnMedia" ADD CONSTRAINT "MediaTagOnMedia_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "MediaTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaStudio" ADD CONSTRAINT "MediaStudio_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaStudio" ADD CONSTRAINT "MediaStudio_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaCharacter" ADD CONSTRAINT "MediaCharacter_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaCharacter" ADD CONSTRAINT "MediaCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaCharacter" ADD CONSTRAINT "MediaCharacter_voiceActorId_fkey" FOREIGN KEY ("voiceActorId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaStaff" ADD CONSTRAINT "MediaStaff_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaStaff" ADD CONSTRAINT "MediaStaff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaRelation" ADD CONSTRAINT "MediaRelation_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaRelation" ADD CONSTRAINT "MediaRelation_relatedMediaId_fkey" FOREIGN KEY ("relatedMediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiringSchedule" ADD CONSTRAINT "AiringSchedule_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaListEntry" ADD CONSTRAINT "MediaListEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaListEntry" ADD CONSTRAINT "MediaListEntry_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaListCustomList" ADD CONSTRAINT "MediaListCustomList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaListEntryCustomList" ADD CONSTRAINT "MediaListEntryCustomList_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "MediaListEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaListEntryCustomList" ADD CONSTRAINT "MediaListEntryCustomList_customListId_fkey" FOREIGN KEY ("customListId") REFERENCES "MediaListCustomList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favourite" ADD CONSTRAINT "Favourite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favourite" ADD CONSTRAINT "Favourite_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favourite" ADD CONSTRAINT "Favourite_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favourite" ADD CONSTRAINT "Favourite_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favourite" ADD CONSTRAINT "Favourite_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRating" ADD CONSTRAINT "ReviewRating_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRating" ADD CONSTRAINT "ReviewRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_messageRecipientId_fkey" FOREIGN KEY ("messageRecipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_mediaListEntryId_fkey" FOREIGN KEY ("mediaListEntryId") REFERENCES "MediaListEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReply" ADD CONSTRAINT "ActivityReply_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReply" ADD CONSTRAINT "ActivityReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

